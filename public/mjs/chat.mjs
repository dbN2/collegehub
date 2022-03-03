const socket = io() // connects to the server

// items
const $messageForm = document.querySelector('#msg-form')
const $messageFormInput = $messageForm.querySelector('input')
const $messageFormButton = $messageForm.querySelector('button')
const $sendLocationButton = document.querySelector('#send-location')
const $messages = document.querySelector('#messages')

// templates
const messageTemplate = document.querySelector('#message-template').innerHTML
const locationMessageTemplate = document.querySelector('#location-message-template').innerHTML
const sidebarTemplate = document.querySelector("#sidebar-template").innerHTML

// options
const {username, room} = Qs.parse(location.search, {ignoreQueryPrefix:true}) // ignore the ?

// scrolls the messages up if the user is at the bottom
const autoscroll = ()=>{
    // get new mgs
    const $newMessage = $messages.lastElementChild

    // calc height from message plus margin
    const newMessageHeight = $newMessage.offsetHeight + parseInt(getComputedStyle($newMessage).marginBottom)

    // visible height
    const visibleHeight = $messages.offsetHeight

    // height of messages container
    const containerHeight = $messages.scrollHeight
    const scrollOffSet = $messages.scrollTop + visibleHeight
    
    // scroll depending on the height
    // if(containerHeight - newMessageHeight <= scrollOffSet){
    //     $messages.scrollTop = $messages.scrollHeight            // pushes to the bottom
    // }
    $messages.scrollTop = $messages.scrollHeight
}

// listen for events from server
socket.on('message', (msg)=>{
    const html = Mustache.render(messageTemplate, {
        username: msg.username,
        msg: msg.text,
        createdAt: moment(msg.createdAt).format('MM/DD/YYYY h:mm:ss a')
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

// load all the old messages in for a new login
socket.on('output-messages', data =>{
    if(data.length){
        for(let i = data.length -1; i >= 0; i--) {
            const html = Mustache.render(messageTemplate, {
                username: data[i].username,
                msg: data[i].msg,
                createdAt: moment(data[i].createdAt).format('MM/DD/YYYY h:mm:ss a')
            })
            $messages.insertAdjacentHTML('afterbegin', html)
        }
        //autoscroll()
        $messages.scrollTop = $messages.scrollHeight  
    }
})
socket.on('locationMessage', (message)=>{
    console.log(message)
    const html = Mustache.render(locationMessageTemplate,{
        username: message.username,
        mapUrl:message.url,
        createdAt: moment(message.createdAt).format('MM/DD/YYYY h:mm:ss a')
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

socket.on('roomData', ({room, users})=>{
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    })
    document.querySelector("#sidebar").innerHTML = html
})

$messageForm.addEventListener('submit',(e)=>{
    e.preventDefault()
    // disable
    $messageFormButton.setAttribute('disabled', 'disabled')

    const msg = e.target.elements.message.value

    socket.emit('sendMessage', msg, ()=>{
        // enable
        $messageFormButton.removeAttribute('disabled')
        $messageFormInput.value = ''
        $messageFormInput.focus()

        console.log('message delivered') 
    })
})

$sendLocationButton.addEventListener('click', (e)=>{
    if(!navigator.geolocation){
        return alert('Browser does not support Geolocation')
    }
    $sendLocationButton.setAttribute('disabled', 'disabled')
    navigator.geolocation.getCurrentPosition((position)=>{
        socket.emit('sendLocation', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        }, ()=>{
            $sendLocationButton.removeAttribute('disabled')
            console.log('location delivered')
        })
    })
})


socket.emit('join', {username, room}, (error)=>{
    if(error){
        alert(error)
        location.href = '/'     // send invalid user to the join page
    }
})