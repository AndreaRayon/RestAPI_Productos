'use strict'
const express = require('express');
const fs = require('fs');
const app = express();
const port =  process.env.PORT || 3000;
const chalk = require('chalk');
const bodyParser = require('body-parser');
const cors = require('cors');

let productos = JSON.parse(fs.readFileSync('productos.json'));
app.use(express.static(__dirname + '/public'));

let usuarios = JSON.parse(fs.readFileSync('usuarios.json'));

let corsOptions = {
    origin: 'http://127.0.0.1:5500',
    optionsSuccessStatus: 200
}

let jsonParser = bodyParser.json();
app.use(jsonParser);
app.use(cors(corsOptions));
let lastId = Object.keys(productos).length;
app.use(log);
app.route('/producto')
    .get((req,res)=>{ 
        if(req.query.marca){
            let filter = productos.filter(prod =>  prod.marca === req.query.marca);
            res.json(filter); 
            console.log(filter);
            res.status(201).send();
            return;
        } 
        res.json(productos);
        

    }).post(verificarToken, (req,res)=>{
        console.log(JSON.stringify(req.body));
        console.log(chalk.blue(JSON.stringify(req.body.id)));

        if(req.body.nombre && req.body.marca && (req.body.precio >= 0) && req.body.descripcion && (req.body.existencia >= 0)){
            let producto = req.body;
            producto.id = lastId;
            productos.push(producto);
            fs.writeFileSync('productos.json', JSON.stringify(productos));
            console.log(productos);
            res.json(producto);
            res.status(201).send();
            lastId++;
            return;
        }
            res.status(400).send({
                error: "Faltan datos para agregar producto"
            });
});

app.route('/producto/:id')
    .get(findId, (req, res) => {
        let id = req.params.id; 
        let prd = productos.find(pro => pro.id == id);
        if(prd) {
            res.json(prd);
            console.log(prd);
        } else 
            res.json({error: "id no encontrado"});

    }).patch(verificarToken, findId, (req, res) => {
        let id = req.params.id;
        if(partialUpdate(id, req.body)) {
            res.json(productos[id]);
            res.status(200).send();            
        } else {
            res.status(400).send({error: "no se encontró el id"});
        }
    });

/***********************/
app.route('/usuario').get((req, res) => res.json(usuarios));
/***********************/
app.route('/usuario/login')
    .post(findUser, (req, res) =>{
        console.log(JSON.stringify(req.body));
        if(req.body.usuario && (req.body.password.length >= 6)) {
            let usuario = req.body;
            let usr = usuarios.find(us => us.usuario == usuario.usuario); 
            usr.token = generateToken();
            usr.tokenTime = Date.now();
            res.set('x-auth', usr.token);
            console.log(usr);
            fs.writeFileSync('usuarios.json', JSON.stringify(usuarios));
            res.json(usuario.usuario);
            res.status(201).send();
        }
        res.status(400).send({
            error: "Es necesario el usuario y la contraseña"
        });
});
app.route('/usuario/logout')
    .post(verificarToken, (req, res) => {
        let token = req.get('x-auth');
        let usuario = req.get('x-user');
        let usr = usuarios.find(us => us.token == token); 
        usr.token = "";
        usr.tokenTime = 0;
        console.log(usr);
        res.status(201).send();
    });

app.listen(port, () => console.log(`Example app listening on port ${port}!`));

function partialUpdate(id, producto){
    let pos = productos.findIndex(al => al.id == id);
    if(pos>= 0){
        productos[pos].nombre = (producto.nombre) ? producto.nombre: productos[pos].nombre;
        productos[pos].marca = (producto.marca) ? producto.marca: productos[pos].marca;
        productos[pos].descripcion = (producto.descripcion) ? producto.descripcion: productos[pos].descripcion;
        productos[pos].precio = (producto.precio) ? (producto.precio >= 0 ? producto.precio : productos[pos].precio) : productos[pos].precio;
        productos[pos].existencia = (producto.existencia) ? (producto.existencia >= 0 ? producto.existencia : productos[pos].existencia) : productos[pos].existencia;
        fs.writeFileSync('productos.json', JSON.stringify(productos));
        return true;
    }
    return false;
}

function findId(req, res, next){
    let id = req.params.id;
    console.log("verificando id " + id);
    let pos = productos.findIndex(al => al.id == id);
    if(pos==-1){
        res.status(404).send({
            error: "Producto no encontrado"
        });
        return;
    } 
    next();
}

function findUser(req, res, next){
    let user = req.body.usuario;
    console.log(user);
    let password = req.body.password;
    let usr = usuarios.findIndex(us => us.usuario == user && us.password == password); 
    console.log(usr);
    if(usr == -1){
        res.status(406).send({
            error: "Usuario Inválido"
        });
        return; 
    } 
    next();
}

function generateToken() {
    return Math.random().toString(36).substring(2, 15);
}

function verificarToken(req, res, next) {
    let token = req.get('x-auth');
    let usr = usuarios.find(us => us.token == token); 
    console.log(usr.tokenTime);
    let now = Date.now();
    console.log(now-usr.tokenTime);
    if(now - usr.tokenTime > 300000 || usr.token == ""){
        res.status(400).send({
            error: "Sesion Expirada"
        });
        return; 
    }
    next();
}
function log(req, res, next){
    console.log("método", req.method);
    console.log("url", req.originalUrl);
    console.log("fecha", new Date(Date.now()).toString());//obteneralgúnheader
    console.log("content-type", req.get('Content-Type'));
    console.log("x-auth", req.get('x-auth'));
    next();//ejecutala siguientefunción
}

