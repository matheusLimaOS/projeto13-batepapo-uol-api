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

app.listen(5000);