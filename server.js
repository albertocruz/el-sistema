const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ESTADO_FILE = path.join(__dirname, 'estado.json');

app.use(express.json());
app.use(express.static(__dirname));

function loadEstado(){
  if(fs.existsSync(ESTADO_FILE)){
    try{return JSON.parse(fs.readFileSync(ESTADO_FILE,'utf8'));}
    catch(e){return {};}
  }
  return {};
}

function saveEstado(estado){
  fs.writeFileSync(ESTADO_FILE,JSON.stringify(estado,null,2),'utf8');
}

app.get('/api/estado',(req,res)=>{
  res.json(loadEstado());
});

app.post('/api/estado',(req,res)=>{
  const {id,...data}=req.body;
  if(!id)return res.status(400).json({error:'id requerido'});
  const estado=loadEstado();
  estado[id]={...estado[id],...data,updated_at:new Date().toISOString()};
  saveEstado(estado);
  res.json({ok:true});
});

app.listen(PORT,()=>console.log('El Sistema en puerto',PORT));
