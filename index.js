import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import joi from 'joi';
import dayjs from "dayjs";
const app = express();

app.use(express.json())
app.use(cors())

const mongoClient = new MongoClient("mongodb://localhost:27017");
let db;

mongoClient.connect().then(() => {
	db = mongoClient.db("batepapoUol");
});

async function verificaOnline(user){
    return await db.collection("users").find({name:user}).toArray().then(users=>{
        if(users.length === 0){
            return false;
        }
        else{
            return true;
        }
    });
}

app.post("/participants",(req,res)=>{
    const userSchema = joi.string().required();
    let name = req.body.name;

    let validation = userSchema.validate(name,{abortEarly:false});

    if(validation.error){
        const erros = validation.error.details.map((detail) => detail.message);
        res.status(422).send(erros);
        return;
    }
    else{
        db.collection("users").find({name:name}).toArray().then(users=>{
            if(users.length === 0){
                let status = Date.now();
                db.collection("users").insertOne({
                    name: name,
                    lastStatus: status
                }).then(()=>{
                    db.collection("messages").insertOne({
                        from: name,
                        to: 'Todos',
                        text: 'entra na sala...',
                        type: 'status',
                        time: dayjs(status).format('HH:mm:ss') 
                    })
                });
                res.status(201).send();
            }
            else{
                res.status(409).send();
            }
        });


    }
})

app.get("/participants",(req,res)=>{
    db.collection("users").find().toArray().then(users=>{
        res.status(200).send(users);
    });
})

app.post("/messages",async (req,res)=>{
    const userSchema = joi.object({
        from: joi.string().required(),
        to: joi.string().required(),
        type: joi.string().required(),
        text: joi.string().required()
    })

    let from = req.headers.user;
    let {to,text,type} = req.body;
    let object = {from,to,text,type}

    let validation = userSchema.validate(object);

    if(validation.error){
        const erros = validation.error.details.map((detail) => detail.message);
        res.status(422).send(erros);
        return;
    }
    else{
        let online = await verificaOnline(from);
        let valida = (type === 'message' || type === 'private_message');

        if(online && valida){
            db.collection("messages").insertOne({
                to,
                from,
                text,
                type,
                time: dayjs(Date.now()).format('HH:mm:ss')  
            })
            res.status(201).send();
        }
        else{
            res.status(422).send("OK");
        }

    }
})

app.get("/messages",(req,res)=>{
    let limit = req.query.limit === undefined ? 0 : parseInt(req.query.limit);
    let {user} = req.headers;
    const userSchema = joi.string().required();

    let validation = userSchema.validate(user);

    if(validation.error){
        const erros = validation.error.details.map((detail) => detail.message);
        res.status(422).send(erros);
        return;
    }
    else{
        db.collection("messages").find({$or:[{to:user},{to:"Public"},{from:user}]}).sort({"_id":-1}).limit(limit).toArray().then(messages=>{
            if(messages.length === 0){
                res.status(404).send();
            }
            else{
                res.status(200).send(messages)
            }
        });
    }
})

app.post("/status",(req,res)=>{
    let user = req.headers.user;

    db.collection("users").find({name:user}).toArray().then(users=>{
        if(users.length === 0){
            res.status(404).send();
        }
        else{
            db.collection("users").updateOne({name:user}, {$set:{lastStatus:Date.now()}}, function(err, res) {
                if (err) throw err;
                console.log("1 document updated");
            });
            res.status(200).send();
        }
    });
})





app.listen(5000);