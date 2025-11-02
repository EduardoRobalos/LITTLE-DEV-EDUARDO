const express = require('express');
const multer = require('multer');
const path = require('path');
const dbConnection = require('./models/db');
const util = require('util');
const query = util.promisify(dbConnection.query).bind(dbConnection); 

const app = express();
const PORT = 8080; 

app.use(express.json());
app.use(express.static(path.join(__dirname, 'src')));


const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }
});

function executePromisified(sql, values) {
    return new Promise((resolve, reject) => {
        dbConnection.query(sql, values, (error, results) => {
            if (error) {
                return reject(error);
            }
            resolve(results);
        });
    });
}

app.use(express.static(path.join(__dirname, 'src')));

app.post('/salas', upload.single('arquivo_upload'), async (req, res) => {
    const file = req.file;

    if (!file) {
        return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado.' });
    }

    try {
        const nomeArquivo = file.originalname;
        const tipoMime = file.mimetype;
        const dadosBinarios = file.buffer; 

        const query = 'INSERT INTO salas (numero, andar, bloco, capacidade) VALUES (?, ?, ?, ?)';
        const resultado = await executePromisified(query, [numero, andar, bloco, capacidade]);

        res.json({ 
            success: true, 
            message: 'Arquivo enviado e salvo com sucesso!', 
            id: resultado.insertId 
        });

    } catch (erro) {
        console.error('Erro ao salvar o arquivo:', erro);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
});

// rota para cadastrar nova sala
app.post("/cadastro", async (req, res) => {
    console.log(req.body)
    const { numero, andar, capacidade, bloco } = req.body;
    console.log(numero, andar, bloco, capacidade)
  
    if (!numero || !andar || !capacidade || !bloco) {
      return res.status(400).send("Campos obrigatórios ausentes");
    }
    try{
        const results = await query ('INSERT INTO salas (numero, andar, capacidade, bloco) VALUES (?, ?, ?, ?)',[numero, andar, capacidade, bloco ]);
    }
    catch (err) {
        console.error('Erro no MySQL:', err);
        res.status(500).json({ error: err.message });
    }
  });

//Rota para RESERVAR uma sala
	app.post("/api/reservar", async (req, res) => {
	    const { salaID, data, horario, periodo, solicitante } = req.body;

    // Validação básica
    if (!salaID || !data || !horario || !solicitante) {
        return res.status(400).json({ success: false, message: "Dados incompletos: salaID, data, horario ou solicitante ausentes." });
    }

    try {
        const [year, month, day] = data.split('-').map(Number); 
      
        const [hour, minute] = horario.split(':').map(Number); 
        
        const dataInicioObj = new Date(year, month - 1, day, hour, minute, 0); 

        //Verifica se a data é válida
        if (isNaN(dataInicioObj.getTime())) {
             console.error(`Erro ao criar Date object: data=${data}, horario=${horario}`);
             return res.status(400).json({ success: false, message: "Valor de Data ou Horário inválido." });
        }

        // Formata dataInicio para o formato SQL DATETIME (YYYY-MM-DD HH:MM:SS)
        const pad = (num) => String(num).padStart(2, '0');
        const dataInicioStr = `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:00`;

        const dataTerminoObj = new Date(dataInicioObj.getTime()); 
        dataTerminoObj.setHours(dataTerminoObj.getHours() + 2); // Adiciona 2 horas
        
        // Formata dataTermino para SQL
        const endYear = dataTerminoObj.getFullYear();
        const endMonth = pad(dataTerminoObj.getMonth() + 1); 
        const endDay = pad(dataTerminoObj.getDate());
        const endHour = pad(dataTerminoObj.getHours());
        const endMinute = pad(dataTerminoObj.getMinutes());

        const dataTerminoStr = `${endYear}-${endMonth}-${endDay} ${endHour}:${endMinute}:00`;
        
        const checkQuery = `
            SELECT reservaID FROM reserva
            WHERE salasID = ? 
            AND statusReserva = 'Reservada'
            AND (
                (? BETWEEN dataInicio AND dataTermino) OR 
                (? BETWEEN dataInicio AND dataTermino) OR
                (dataInicio BETWEEN ? AND ?)
            )
        `;
        const existingReservations = await executePromisified(checkQuery, [salaID, dataInicioStr, dataTerminoStr, dataInicioStr, dataTerminoStr]);

        if (existingReservations.length > 0) {
            return res.status(409).json({ success: false, message: "Sala já reservada para este horário. Conflito detectado." });
        }
        
        const solicitanteQuery = `
            INSERT INTO solicitante (nome, salasID) VALUES (?, ?)
        `;
        await executePromisified(solicitanteQuery, [solicitante, salaID]);
    
	        const insertQuery = `
	            INSERT INTO reserva (statusReserva, periodo, salasID, dataInicio, dataTermino)
	            VALUES (?, ?, ?, ?, ?)
	        `;
	        await executePromisified(insertQuery, ['Reservada', periodo, salaID, dataInicioStr, dataTerminoStr]);
        
        res.json({ success: true, message: "Reserva realizada com sucesso." });

    } catch (erro) {
        console.error('Erro ao reservar sala:', erro);
        res.status(500).json({ success: false, message: `Erro interno ao processar a reserva: ${erro.sqlMessage || erro.message}` });
    }
});

app.get('/arquivo/:id', async (req, res) => {
    const idArquivo = req.params.id;

    try {
        const query = 'SELECT nome, tipo_mime, dados FROM arquivos WHERE id = ?';
        const linhas = await executePromisified(query, [idArquivo]);

        if (linhas.length === 0) {
            return res.status(404).send('Arquivo não encontrado.');
        }

        const arquivo = linhas[0];
        const dadosBinarios = arquivo.dados;

        res.setHeader('Content-Type', arquivo.tipo_mime);
        res.setHeader('Content-Disposition', `attachment; filename="${arquivo.nome}"`);
        
        res.send(dadosBinarios);

    } catch (erro) {
        console.error('Erro ao recuperar o arquivo:', erro);
        res.status(500).send('Erro interno ao recuperar o arquivo.');
    }
});

app.get('/rooms', async (req, res) => {
    try {
        // Esta consulta busca todos os detalhes das salas e, se houver, a última reserva.
        // Em um sistema real, a lógica de 'Reservada' vs 'Disponível' precisaria checar 
        // se dataTermino > NOW(). Para simplificar, estamos pegando a última reserva para demonstração.
        const query = `
            SELECT 
                s.salasID, s.numero, s.andar, s.capacidade, s.bloco,
                r.reservaID, r.statusReserva, r.periodo, r.dataInicio, r.dataTermino
            FROM salas s
            LEFT JOIN reserva r ON s.salasID = r.salasID
            ORDER BY s.numero, r.dataInicio DESC;
        `;
        
        const roomsData = await executePromisified(query);

        // Processa o resultado para estruturar os dados e determinar o status atual de cada sala
        const roomsMap = {};

        roomsData.forEach(row => {
            const salaId = row.salasID;
            if (!roomsMap[salaId]) {
                roomsMap[salaId] = {
                    id: row.salasID,
                    numero: row.numero,
                    andar: row.andar,
                    capacidade: row.capacidade,
                    bloco: row.bloco,
                    status: 'Disponível', // Status padrão
                    reservation: null 
                };
            }
            
            // Assume que a última reserva 'Reservada' encontrada é a atual
            if (row.reservaID && row.statusReserva === 'Reservada' && !roomsMap[salaId].reservation) {
                roomsMap[salaId].status = 'Reservada';
                roomsMap[salaId].reservation = {
                    id: row.reservaID,
                    periodo: row.periodo,
                    dataInicio: row.dataInicio,
                    dataTermino: row.dataTermino
                };
            }
        });
        
        const rooms = Object.values(roomsMap);
        
        res.json({ success: true, rooms });
    } catch (erro) {
        console.error('Erro ao buscar salas:', erro);
        res.status(500).json({ success: false, message: 'Erro interno ao buscar salas.' });
    }
    const roomsData = await executePromisified(query);
console.log('DADOS BRUTOS DO BANCO:', roomsData);
});

app.get('/api/cadastro-salas', async (req, res) => {
    try {
        // Busca os campos da tabela 'cadastroSalas' no seu DB little dev.sql
        const query = 'SELECT cadastroID AS salasID, numero, andar, bloco, tipo FROM cadastroSalas ORDER BY numero';
        const resultados = await executePromisified(query);

        res.json({ success: true, salas: resultados });
    } catch (erro) {
        console.error('Erro ao buscar salas de cadastro:', erro);
        res.status(500).json({ success: false, message: 'Erro interno ao buscar dados.' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

app.get("/api/proximas-reservas", async (req, res) => {
  try {
    const querySql = `
      SELECT r.reservaID, r.data, r.horario, r.solicitante, 
             s.salasID, s.numero, s.bloco, s.andar, s.capacidade
      FROM reservas r
      JOIN salas s ON r.salaID = s.salasID
      WHERE r.data >= CURDATE()
      ORDER BY r.data ASC, r.horario ASC
    `;
    
    const reservas = await query(querySql);
    res.json({ success: true, reservas });

  } catch (err) {
    console.error("Erro ao buscar próximas reservas:", err);
    res.status(500).json({ success: false, message: "Erro interno ao buscar reservas." });
  }
});


app.get("/api/salas", async (req, res) => {
    try {
        const query = `
            SELECT 
                s.salasID AS id,
                s.numero,
                s.andar,
                s.bloco,
                s.capacidade, /* Garante que 'capacidade' é selecionada */
                COALESCE(r.periodo, 'Indefinido') AS periodo,
                CASE 
                    WHEN r.reservaID IS NOT NULL 
                    AND r.statusReserva = 'Reservada' 
                    THEN 'Reservada' 
                    ELSE 'Disponível' 
                END AS status
            FROM salas s
            LEFT JOIN reserva r ON s.salasID = r.salasID 
                -- Filtra por reservas ATIVAS AGORA
                AND r.statusReserva = 'Reservada'
                AND NOW() BETWEEN r.dataInicio AND r.dataTermino
            ORDER BY s.numero ASC;
        `;
        
        const resultados = await executePromisified(query);
        
        // Mapeia os resultados (isso já estava correto, mas garante a consistência)
        const salasFormatadas = resultados.map(sala => ({
            id: sala.id, // salasID se torna id
            numero: sala.numero,
            andar: sala.andar,
            capacidade: sala.capacidade,
            bloco: sala.bloco,
            status: sala.status, 
            periodo: sala.periodo
        }));
        
        res.json({ success: true, salas: salasFormatadas });

    } catch (err) {
        console.error("ERRO CRÍTICO NO MYSQL (API/SALAS):", err); // Veja este erro no seu terminal!
        res.status(500).json({ success: false, message: "Erro interno ao carregar salas. Verifique o terminal do servidor." });
    }
});

app.get('/salas', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'salas.html'));
});

app.get('/cadastro', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'cadastro.html'));
});

app.listen(8080, () => {
    console.log(`Servidor Node.js rodando em http://localhost:${8080}`);
});