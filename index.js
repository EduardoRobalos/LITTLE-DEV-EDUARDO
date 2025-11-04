const express = require('express');
const multer = require('multer');
const path = require('path');
const dbConnection = require('./models/db');
const util = require('util');
const query = util.promisify(dbConnection.query).bind(dbConnection); 
let existingReservations = [];
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

	app.post("/api/reservar", async (req, res) => {
  const { salaID, data, horario, solicitante, periodo } = req.body;

  if (!salaID || !data || !horario || !solicitante) {
    return res.status(400).json({
      success: false,
      message: "Dados incompletos para reserva."
    });
  }

  try {
    // Converte data e horário
    const [year, month, day] = data.split("-").map(Number);
    const [hour, minute] = horario.split(":").map(Number);
    const inicio = new Date(year, month - 1, day, hour, minute, 0);

    if (isNaN(inicio.getTime())) {
      return res.status(400).json({ success: false, message: "Data ou horário inválido." });
    }

    const pad = (n) => String(n).padStart(2, "0");
    const dataInicioStr = `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:00`;

    // Termino = início + 2 horas
    const fim = new Date(inicio.getTime() + 2 * 60 * 60 * 1000);
    const dataTerminoStr = `${fim.getFullYear()}-${pad(fim.getMonth() + 1)}-${pad(fim.getDate())} ${pad(fim.getHours())}:${pad(fim.getMinutes())}:00`;

    // Verifica conflito
    const conflitoSQL = `
      SELECT reservaID FROM reserva
      WHERE salasID = ?
        AND statusReserva = 'Reservada'
        AND NOT (dataTermino <= ? OR dataInicio >= ?)
    `;
    const conflito = await query(conflitoSQL, [salaID, dataInicioStr, dataTerminoStr]);

    if (conflito.length > 0) {
      return res.status(409).json({ success: false, message: "⛔ Sala já reservada nesse horário." });
    }

    // Cadastra solicitante
    const resultSolic = await query("INSERT INTO solicitante (Nome) VALUES (?)", [solicitante]);
    const solicitanteID = resultSolic.insertId;

    // ✅ **INSERÇÃO CORRETA → apenas 1 registro**
    const insertSQL = `
      INSERT INTO reserva (salasID, dataInicio, dataTermino, periodo, statusReserva, solicitanteID)
      VALUES (?, ?, ?, ?, 'Reservada', ?)
    `;
    await query(insertSQL, [salaID, dataInicioStr, dataTerminoStr, periodo, solicitanteID]);

    res.json({ success: true, message: "✅ Sala reservada com sucesso!" });

  } catch (err) {
    console.error("Erro ao reservar sala:", err);
    res.status(500).json({ success: false, message: "Erro interno ao reservar sala." });
  }
});


app.delete("/api/salas/:id", async (req, res) => {
    const salaID = req.params.id;
    try {
        await executePromisified("DELETE FROM reserva WHERE salasID = ?", [salaID]);
        
        // Em seguida, exclui a sala
        const query = "DELETE FROM salas WHERE salasID = ?";
        const result = await executePromisified(query, [salaID]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Sala não encontrada." });
        }

        res.json({ success: true, message: `Sala ID ${salaID} e suas reservas excluídas com sucesso.` });
    } catch (err) {
        console.error("Erro ao excluir sala:", err);
        res.status(500).json({ success: false, message: "Erro interno ao excluir sala." });
    }
});

app.put("/api/reservas/cancelar/:id", async (req, res) => {
    const reservaID = req.params.id;
    try {
        const query = "DELETE FROM reserva WHERE reservaID = ?";
        const result = await executePromisified(query, [reservaID]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Reserva não encontrada." });
        }

        res.json({ success: true, message: `Reserva ID ${reservaID} cancelada com sucesso.` });
    } catch (err) {
        console.error("Erro ao cancelar reserva:", err);
        res.status(500).json({ success: false, message: "Erro interno ao cancelar reserva." });
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

const PDFDocument = require("pdfkit");
const fs = require("fs");

app.get('/api/exportar-pdf', async (req, res) => {
  try {
    const registros = await query(`SUA QUERY AQUI`);
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition','attachment; filename="relatorio.pdf"');

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    // cabeçalho etc...
    doc.text('Relatório', { align: 'center' });
    // tabela simples
    registros.forEach(r => {
      doc.moveDown()
        .fontSize(12).text(`Sala ${r.numero} - Bloco ${r.bloco}`)
        .text(`Data: ${r.dataInicio.toISOString ? r.dataInicio.toISOString().split('T')[0] : r.dataInicio}`)
        .text(`Horário: ${r.horario || r.periodo}`)
        .text(`Solicitante: ${r.solicitante}`);
    });

    doc.end();
  } catch (err) {
    console.error('Erro gerar PDF:', err);
    res.status(500).send('Erro ao gerar PDF: ' + err.message);
  }
});



app.get('/rooms', async (req, res) => {
    try {
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
                    status: 'Disponível', 
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
    const sql = `
      SELECT 
        r.reservaID,
        r.dataInicio,
        r.periodo,
        s.salasID,
        s.numero,
        s.bloco,
        s.andar,
        s.capacidade,
        sol.Nome AS solicitante
      FROM reserva r
      JOIN salas s ON r.salasID = s.salasID
      JOIN solicitante sol ON r.solicitanteID = sol.Solicitante
      WHERE r.dataInicio >= CURDATE()
      ORDER BY r.dataInicio ASC;
    `;

    const reservas = await query(sql);
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
                s.capacidade,
                COALESCE(r.periodo, 'Indefinido') AS periodo,
                CASE 
                    WHEN r.reservaID IS NOT NULL 
                    AND r.statusReserva = 'Reservada' 
                    THEN 'Reservada' 
                    ELSE 'Disponível' 
                END AS status
            FROM salas s
            LEFT JOIN reserva r ON s.salasID = r.salasID 
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