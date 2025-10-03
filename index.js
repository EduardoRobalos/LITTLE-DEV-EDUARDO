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

app.post('/upload', upload.single('arquivo_upload'), async (req, res) => {
    const file = req.file;

    if (!file) {
        return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado.' });
    }

    try {
        const nomeArquivo = file.originalname;
        const tipoMime = file.mimetype;
        const dadosBinarios = file.buffer; 

        const query = 'INSERT INTO arquivos (nome, tipo_mime, dados) VALUES (?, ?, ?)';
        const resultado = await executePromisified(query, [nomeArquivo, tipoMime, dadosBinarios]);

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

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

app.listen(8080, () => {
    console.log(`Servidor Node.js rodando em http://localhost:${8080}`);
});