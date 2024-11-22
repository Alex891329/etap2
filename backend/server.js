const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb');

const app = express();
const port = 3000;  

// Conexão com o MongoDB
const uri = process.env.MONGODB_URI || "mongodb+srv://alexaraujosj:eoy1Ia20yZyLmFHR@cluster0.8lsip.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
let db;

async function getDb() {
  if (!db) {
    const client = new MongoClient(uri);  // Removido as opções descontinuadas
    await client.connect();
    db = client.db();
  }
  return db;
}

app.use(cors());
app.use(bodyParser.json());

// Função para gerar um JWT
function generateToken(user) {
  return jwt.sign({ user }, 'sua_chave_secreta', { expiresIn: '1h' });
}

// Rota para login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const db = await getDb();
  const users = db.collection('usuarios');

  // Buscar o usuário no banco de dados
  const user = await users.findOne({ email });

  if (user && await bcrypt.compare(password, user.password)) {
    // Gerar um JWT se a senha for correta
    const token = generateToken(user);
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Credenciais inválidas' });
  }
});

// Rota para cadastro de usuário
app.post('/registrar', async (req, res) => {
  const { email, password } = req.body;
  const db = await getDb();
  const users = db.collection('usuarios');

  try {
    // Verificar se o usuário já existe
    const existingUser = await users.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Usuário já existe' });
    }

    // Hash da senha antes de salvar no banco de dados
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      email,
      password: hashedPassword,
    };

    // Salvar o novo usuário no banco de dados
    await users.insertOne(newUser);
    res.status(201).json({ message: 'Usuário criado com sucesso' });
  } catch (err) {
    console.error('Erro ao cadastrar usuário:', err);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

// Rota para buscar todos os usuários cadastrados
app.get('/usuarios', async (req, res) => {
  const db = await getDb();
  const users = db.collection('usuarios');

  try {
    const allUsers = await users.find().toArray();
    res.json(allUsers);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

// Rota protegida (exemplo)
app.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: 'Bem-vindo à página de serviços!' });
});

// Função de autenticação
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, 'sua_chave_secreta', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
