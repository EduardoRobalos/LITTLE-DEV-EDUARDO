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
      const [year, month, day] = data.split("-").map(Number);
      const [hour, minute] = horario.split(":").map(Number);
      const inicio = new Date(year, month - 1, day, hour, minute, 0);
      if (isNaN(inicio.getTime())) return res.status(400).json({ success: false, message: "Data ou horário inválido." });
  
      const pad = (n) => String(n).padStart(2, "0");
      const dataInicioStr = `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:00`;
  
      const fim = new Date(inicio.getTime() + 2 * 60 * 60 * 1000);
      const dataTerminoStr = `${fim.getFullYear()}-${pad(fim.getMonth() + 1)}-${pad(fim.getDate())} ${pad(fim.getHours())}:${pad(fim.getMinutes())}:00`;
  
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
  
      const resultSolic = await query("INSERT INTO solicitante (nome) VALUES (?)", [solicitante]);
      const solicitanteID = resultSolic.insertId;
  
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
        LEFT JOIN solicitante sol ON r.solicitanteID = sol.solicitante
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

   app.put("/api/salas/:id", async (req, res) => {
  const id = req.params.id;
  const { numero, andar, bloco, capacidade } = req.body;

  try {
      const sql = `
        UPDATE salas
        SET numero = ?, andar = ?, bloco = ?, capacidade = ?
        WHERE salasID = ?
      `;

      const result = await executePromisified(sql, [numero, andar, bloco, capacidade, id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "Sala não encontrada." });
      }

      res.json({ success: true, message: "Sala atualizada com sucesso." });

  } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Erro ao atualizar sala." });
  }
});

app.delete("/api/salas/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await executePromisified(
      "DELETE FROM reserva WHERE salasID = ?",
      [id]
    );
    const result = await executePromisified(
      "DELETE FROM salas WHERE salasID = ?", 
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Sala não encontrada"
      });
    }

    res.json({
      success: true,
      message: "Sala excluída com sucesso"
    });

  } catch (error) {
    console.error("Erro ao excluir sala:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao excluir sala"
    });
  }
});

const PDFDocument = require("pdfkit");
const fs = require("fs");

app.get('/api/exportar-pdf', async (req, res) => {
    try {
      const querySQL = `
        SELECT 
          r.reservaID,
          s.numero,
          s.bloco,
          r.dataInicio,
          r.dataTermino,
          r.periodo,
          sol.nome AS solicitanteName
        FROM reserva r
        JOIN salas s ON r.salasID = s.salasID
        LEFT JOIN solicitante sol ON r.solicitanteID = sol.solicitante 
        ORDER BY r.dataInicio DESC;
      `;

const registros = await executePromisified(querySQL);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="relatorio_tabela_salas.pdf"');

        const doc = new PDFDocument({ margin: 0, size: 'A4' });
        doc.pipe(res);

        const azulEscuro = '#17307a'; 
        const fundoCinza = '#f1f5f9'; 
        const textoPreto = '#1e293b'; 

        const drawPageHeader = () => {
            doc.rect(0, 0, 595.28, 70).fill(azulEscuro);
        
            doc.fontSize(20).font('Helvetica-Bold').fillColor('#FFFFFF')
               .text('Relatório de Reservas', 40, 25);
            
            doc.fontSize(9).font('Helvetica').fillColor('#cbd5e1')
               .text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 40, 50);
        };

        const colSala = 40;
        const colSolicitante = 130;
        const colData = 300;
        const colPeriodo = 480;
        const tableWidth = 515; 

        const drawTableHeader = (y) => {
            doc.rect(40, y, tableWidth, 25).fill(azulEscuro);
            doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
            doc.text('SALA / BLOCO', colSala + 5, y + 8);
            doc.text('SOLICITANTE', colSolicitante + 5, y + 8);
            doc.text('DATA E HORÁRIO', colData + 5, y + 8);
            doc.text('PERÍODO', colPeriodo + 5, y + 8);
        };
        drawPageHeader();
        
        let y = 100; 
        drawTableHeader(y);
        y += 25; 

        registros.forEach((r, index) => {
            const rowHeight = 30;

            if (y + rowHeight > 780) {
                doc.addPage();
                drawPageHeader();
                y = 100; 
                drawTableHeader(y);
                y += 25;
            }

            if (index % 2 === 0) {
                doc.rect(40, y, tableWidth, rowHeight).fill(fundoCinza);
            }

            const salaBloco = `${r.numero} - ${r.bloco}`;
            const nomeSolicitante = r.solicitanteName || '-';
            
            const dataFormatada = new Date(r.dataInicio).toLocaleDateString('pt-BR');
            const horaInicio = new Date(r.dataInicio).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
            const horaFim = new Date(r.dataTermino).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
            const horarioCompleto = `${dataFormatada} • ${horaInicio}-${horaFim}`;

            doc.fillColor(textoPreto).fontSize(9).font('Helvetica');

            doc.text(salaBloco, colSala + 5, y + 10, { width: 80, ellipsis: true });

            doc.text(nomeSolicitante, colSolicitante + 5, y + 10, { width: 160, ellipsis: true });

            doc.text(horarioCompleto, colData + 5, y + 10, { width: 170 });

            doc.text(r.periodo || '-', colPeriodo + 5, y + 10, { width: 70, ellipsis: true });

            y += rowHeight;
        });

        doc.end();

    } catch (err) {
        console.error('Erro gerar PDF:', err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Erro ao gerar PDF: ' + err.message });
        }
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