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
      return res.status(400).json({ success: false, message: "Dados incompletos para reserva." });
    }
  
    try {
      // data: "YYYY-MM-DD", horario: "HH:MM" (pegamos hora de início)
      const [year, month, day] = data.split("-").map(Number);
      const [hour, minute] = horario.split(":").map(Number);
      const inicio = new Date(year, month - 1, day, hour, minute, 0);
      if (isNaN(inicio.getTime())) return res.status(400).json({ success: false, message: "Data ou horário inválido." });
  
      const pad = (n) => String(n).padStart(2, "0");
      const dataInicioStr = `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:00`;
  
      // Termino = início + 2 horas (ou use periodo para definir)
      const fim = new Date(inicio.getTime() + 2 * 60 * 60 * 1000);
      const dataTerminoStr = `${fim.getFullYear()}-${pad(fim.getMonth() + 1)}-${pad(fim.getDate())} ${pad(fim.getHours())}:${pad(fim.getMinutes())}:00`;
  
      // Verifica conflito (mesma sala, intervalo sobreposto)
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
      const resultSolic = await query("INSERT INTO solicitante (nome) VALUES (?)", [solicitante]);
      const solicitanteID = resultSolic.insertId;
  
      // Insere reserva (guarda solicitanteID)
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
  
  app.get("/api/proximas-reservas", async (req, res) => {
    try {
      const sql = `
        SELECT 
          r.reservaID,
          r.dataInicio,
          r.dataTermino,
          r.periodo,
          s.numero,
          s.bloco,
          s.andar,
          s.capacidade,
          sol.nome AS solicitante
        FROM reserva r
        JOIN salas s ON r.salasID = s.salasID
        LEFT JOIN solicitante sol ON r.solicitanteID = sol.solicitanteID
        WHERE r.statusReserva = 'Reservada'
          AND r.dataInicio >= NOW() - INTERVAL 1 HOUR
        ORDER BY r.dataInicio ASC;
      `;
      const reservas = await query(sql);
      res.json({ success: true, reservas });
    } catch (err) {
      console.error("Erro ao buscar próximas reservas:", err);
      res.status(500).json({ success: false, message: "Erro ao buscar reservas." });
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
      const registros = await query(`
        SELECT r.reservaID, s.numero, s.bloco, r.dataInicio, r.dataTermino, r.periodo, sol.nome AS solicitante, r.statusReserva
        FROM reserva r
        JOIN salas s ON r.salasID = s.salasID
        LEFT JOIN solicitante sol ON r.solicitanteID = sol.solicitanteID
        ORDER BY r.dataInicio DESC;
      `);
  
      res.setHeader('Content-Type','application/pdf');
      res.setHeader('Content-Disposition','attachment; filename="relatorio_salas.pdf"');
  
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      doc.pipe(res);
  
      // Cabeçalho com cor (seguindo paleta do site)
      const primary = "#17307a";
      doc.rect(0, 0, 595.28, 60).fill(primary);
      doc.fillColor('#FFFFFF').fontSize(20).text('Relatório de Reservas', 40, 20);
  
      doc.moveDown(2);
      doc.fillColor('#000000');
  
      // Data de geração
      const now = new Date();
      doc.fontSize(9).fillColor('#333').text(`Gerado em: ${now.toLocaleString('pt-BR')}`, { align: 'right' });
  
      doc.moveDown(0.5);
  
      // Tabela: cabeçalho
      const tableTop = 110;
      const itemX = 40;
      let y = tableTop;
      doc.fontSize(10).fillColor('#17307a').text('Sala', itemX, y);
      doc.text('Bloco', itemX + 60, y);
      doc.text('Solicitante', itemX + 120, y);
      doc.text('Data Início', itemX + 270, y);
      doc.text('Data Término', itemX + 370, y);
      doc.text('Período', itemX + 470, y);
  
      y += 18;
      doc.moveTo(itemX, y - 4).lineTo(555, y - 4).strokeOpacity(0.1).stroke();
  
      // Linhas
      registros.forEach((r, i) => {
        const bg = i % 2 === 0 ? 0.97 : 1.0;
        // Alterna levemente o fundo (PDFKit não tem setOpacityFill para retângulo facilmente, ignoramos bg se quiser)
        const di = r.dataInicio ? new Date(r.dataInicio).toLocaleString('pt-BR') : '';
        const dt = r.dataTermino ? new Date(r.dataTermino).toLocaleString('pt-BR') : '';
  
        doc.fillColor('#222').fontSize(9);
        doc.text(`${r.numero}`, itemX, y);
        doc.text(`${r.bloco || ''}`, itemX + 60, y);
        doc.text(`${r.solicitante || ''}`, itemX + 120, y, { width: 140 });
        doc.text(di, itemX + 270, y);
        doc.text(dt, itemX + 370, y);
        doc.text(r.periodo || '', itemX + 470, y);
  
        y += 18;
        if (y > 720) { // nova página
          doc.addPage();
          y = 40;
        }
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

app.get("/api/salas", async (req, res) => {
    try {
      const querySQL = `
        SELECT 
          s.salasID AS id,
          s.numero,
          s.andar,
          s.bloco,
          s.capacidade,
          COALESCE(r.periodo, 'Indefinido') AS periodo,
          r.reservaID,
          r.dataInicio,
          r.dataTermino,
          CASE 
            WHEN r.reservaID IS NOT NULL 
                 AND r.statusReserva = 'Reservada'
                 AND NOW() BETWEEN r.dataInicio AND r.dataTermino
            THEN 'Reservada'
            ELSE 'Disponível'
          END AS status
        FROM salas s
        LEFT JOIN reserva r ON s.salasID = r.salasID
          AND r.statusReserva = 'Reservada'
          AND NOW() BETWEEN r.dataInicio AND r.dataTermino
        ORDER BY s.numero ASC;
      `;
  
      const resultados = await executePromisified(querySQL);
      const salas = resultados.map(s => ({
        ...s,
        status: s.status || 'Disponível'
      }));
  
      res.json({ success: true, salas });
    } catch (err) {
      console.error("ERRO NO /api/salas:", err);
      res.status(500).json({ success: false, message: "Erro ao carregar salas." });
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