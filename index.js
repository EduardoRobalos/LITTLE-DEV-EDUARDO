const express = require('express');
const multer = require('multer');
const path = require('path');
const dbConnection = require('./models/db'); 

const app = express();
const PORT = 8080; 

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
app.post("/cadastrar-sala", (req, res) => {
    const { numero, andar, capacidade, periodo, status } = req.body;
  
    if (!numero || !andar || !capacidade || !periodo || !status) {
      return res.status(400).send("Campos obrigatórios ausentes");
    }
  
    const sql = "INSERT INTO salas (numero, andar, capacidade, periodo, status) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [numero, andar, capacidade, periodo, status], (err, result) => {
      if (err) {
        console.error("Erro ao inserir sala:", err);
        return res.status(500).send("Erro ao cadastrar sala");
      }
      res.sendStatus(200);
    });
  });

app.get('/arquivos', async (req, res) => {
    try {
        const query = 'SELECT id, nome, tipo_mime, data_upload FROM arquivos ORDER BY data_upload DESC';
        const arquivos = await executePromisified(query);

        res.json({ success: true, arquivos });
    } catch (erro) {
        console.error('Erro ao listar arquivos:', erro);
        res.status(500).json({ success: false, message: 'Erro interno ao listar arquivos.' });
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

// NOVA ROTA para a página de Cadastro
app.get('/salas', (req, res) => {
    // Certifique-se de que seu arquivo 'cadastro.html' existe na pasta 'src'
    res.sendFile(path.join(__dirname, 'src', 'salas.html'));
});

app.listen(8080, () => {
    console.log(`Servidor Node.js rodando em http://localhost:${8080}`);
});