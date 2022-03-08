const express = require("express");
const path = require("path");

const app = require('express')();
const wsInstance = require('express-ws')(app);

app.ws('/', ws => {
    ws.on('message', data => {
        // 未做业务处理，收到消息后直接广播
        wsInstance.getWss().clients.forEach(server => {
            if (server !== ws) {
                server.send(data);
            }
        });
    });
});
app.use(express.static(path.join(__dirname, '/')));

app.get('/send', (req, res) => {
    res.sendFile('./rtc_sender.html', { root: __dirname });
});

app.get('/rec', (req, res) => {
    res.sendFile('./rtc_receiver.html', { root: __dirname });
});
app.listen(8080);
