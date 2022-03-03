import mongoose from 'mongoose'
import validator from 'validator'
import bcrypt from 'bcrypt'
import jsonwebtoken from 'jsonwebtoken'

const userSchema = new mongoose.Schema({
    name: {
        type: String, 
        required: true, 
        trim: true
    },
    email: {
        type: String,
        unique: true,  
        required: true,
        trim: true, 
        lowercase: true, 
        validate(value){
            if(!validator.isEmail(value)){
                throw new Error('Email is Invalid')
            }
        }
    },
    password: {
        type: String, 
        required: true, 
        minlength: 7, 
        trim: true, 
        validate(value){
            if(value.toLowerCase().includes('password')){
                throw new Error("Password can not contain password")
            }
        }
    },
    tokens:[{
        token:{
            type: String,
            required: true
        }
    }]
})

userSchema.methods.toJSON = function(){
    const userObject = this.toObject()
    delete userObject.password
    delete userObject.tokens
    return userObject
}

userSchema.methods.generateAuthToken = async function(){
    const token = jsonwebtoken.sign({_id: this._id.toString()}, process.env.JWT_SECRET)
    this.tokens = this.tokens.concat({token})
    await this.save()
    return token
}

userSchema.statics.findByCredentials = async (email, password)=>{
    const user = await User.findOne({email})

    if(!user){
        throw new Error("Unable to login")
    }
    const matches = await bcrypt.compare(password, user.password)
    if(!matches){
        throw new Error('Unable to login')
    }
    return user
}

// has the plain text password prior to saving
userSchema.pre('save', async function (next){
    const user = this

    if(user.isModified('password')){
        user.password = await bcrypt.hash(user.password, 8)
    }

    next()
})

export const User = mongoose.model('User', userSchema)