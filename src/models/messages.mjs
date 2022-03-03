import mongoose from 'mongoose'

const messagesSchema = new mongoose.Schema({
    msg: {
        type: String, 
        required: true 
    },
    room:{
        type: String,
        retuired: true
    },
    username:{
        type: String,
        required: true
    },
    createdAt:{
        type: Number,
        required: true
    }
})

export const Messages = mongoose.model('Messages', messagesSchema)