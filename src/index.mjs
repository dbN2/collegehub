import path from 'path'
import http from 'http'
import {fileURLToPath} from 'url'
import express from 'express'
import { Server } from 'socket.io';
import Filter from 'bad-words' 
import {generateMessage, generateLocationMessage} from './utils/message.mjs' 
import {getUser, addUser, removeUser, getUsersInRoom} from './utils/users.mjs'
import mongoose from 'mongoose'
import {Messages} from './models/messages.mjs'

mongoose.connect(process.env.MONGODB_URL) // using environment variable

const app = express()
const server = http.createServer(app)
const io = new Server(server);          // set up socketio
const port = process.env.PORT

// define paths for Express config
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDirectoryPath = path.join(__dirname, '../public')


app.use(express.static(publicDirectoryPath))


// some socket methods will be using
// socket.emit -> user, io.emit -> all, socket.broadcast.emit -> all but where it came from
// io.to().emit -> same as abovve but for a room, socket.to().emit -> same as above but for a room

io.on('connection', (socket)=>{
    console.log('new socket connection')    // prints a new message when a new user connects

    socket.on('sendMessage', (msg, callback)=>{

        const user = getUser(socket.id);
        if(!user){
            return callback('No user')
        }

        const filter = new Filter()
        const msgObj = generateMessage(user.username, filter.clean(msg))
        const message = new Messages({msg:msgObj.text,room:user.room,username:user.username,createdAt:msgObj.createdAt})
        message.save().then(()=>{
            io.to(user.room).emit('message', msgObj)
        })


        callback()  // send back acknowledgement
    })

    socket.on('join', ({username, room}, callback)=>{

        const {error, user} = addUser({id:socket.id, username, room})
        if(error){
            return callback(error)
        }
        
        socket.join(user.room)

        // load saved forum messages when a user joins the room
        Messages.find({room}).then((result)=>{
            socket.emit('output-messages', result)
        })
        
        socket.emit('message', generateMessage(`Admin`, 'Welcome!'))
        const str = `${user.username} has joined the forum!`
        socket.broadcast.to(user.room).emit('message', generateMessage(`Admin`, str))

        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        
        callback()
    })

    socket.on('sendLocation', (loc, callback)=>{
        const user = getUser(socket.id)
        if(!user){
            return callback('No user')
        }
        const str = `https://google.com/maps?=${loc.latitude},${loc.latitude}`
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, str))
        callback()
    })

    socket.on('disconnect',()=>{    // built in event
        const user = removeUser(socket.id)
        if(user){
            io.to(user.room).emit('message', generateMessage(`Admin`, `${user.username} has left the room!`))
            io.to(user.room).emit('roomData',{
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })  
})

server.listen(port, ()=>{
    console.log(`Server is up and running on port ${port}`)
})

