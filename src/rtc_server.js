// LOG
const message = {
    el: document.querySelector('.logger'),
    log (msg) {
        this.el.innerHTML += `<span>${new Date().toLocaleTimeString()}：${msg}</span><br/>`;
    },
    error (msg) {
        this.el.innerHTML += `<span class="error">${new Date().toLocaleTimeString()}：${msg}</span><br/>`;
    }
};
// DOM
// const target = location.search.slice(6);
const target = 'offer';
const localVideo = document.querySelector('#local-video');
const remoteVideo = document.querySelector('#remote-video');
const button = document.querySelector('.start-button');

localVideo.onloadeddata = () => {
    message.log('播放本地视频');
    localVideo.play();
}
remoteVideo.onloadeddata = () => {
    message.log('播放对方视频');
    remoteVideo.play();
}



document.title = target === 'offer' ? '发起方' : '接收方';

// peer init

const PeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
!PeerConnection && message.error('浏览器不支持WebRTC！');
const peer = new PeerConnection();

peer.ontrack = e => {
    if (e && e.streams) {
        message.log('收到对方音频/视频流数据...');
        remoteVideo.srcObject = e.streams[0];
    }
};
peer.onicecandidate = e => {
    if (e.candidate) {
        message.log('搜集并发送候选人');
        socket.send(JSON.stringify({
            type: `${target}_ice`,
            iceCandidate: e.candidate
        }));
    } else {
        message.log('候选人收集完成！');
    }
};


//用socket获得sdp描述信息
message.log('信令通道（WebSocket）创建中......');
const socket = new WebSocket('ws://10.203.151.231:8080');
socket.onopen = () => {
    message.log('信令通道创建成功！');
    target === 'offer' && (button.style.display = 'block');
}
socket.onerror = () => message.error('信令通道创建失败！');
socket.onmessage = e => {
    const { type, sdp, iceCandidate } = JSON.parse(e.data)
    if (type === 'answer') {
        peer.setRemoteDescription(new RTCSessionDescription({ type, sdp }));
        setTimeout(function(){
            console.log("answer type sdp")
            console.log(type)
            console.log(sdp)
        },5000);

    } else if (type === 'answer_ice') {
        peer.addIceCandidate(iceCandidate);
    } else if (type === 'offer') {
        startLive(new RTCSessionDescription({ type, sdp }));
        setTimeout(function(){
            console.log("offer type sdp")
            console.log(type)
            console.log(sdp)
        },5000);
    } else if (type === 'offer_ice') {
        peer.addIceCandidate(iceCandidate);
    }
};



peer.onicecandidate = e => {
    if (e.candidate) {
        message.log('搜集并发送候选人');
        socket.send(JSON.stringify({
            type: `${target}_ice`,
            iceCandidate: e.candidate
        }));
    } else {
        message.log('候选人收集完成！');
    }
};

async function startLive (offerSdp) {
    target === 'offer' && (button.style.display = 'none');
    let stream;
    try {
        message.log('尝试调取本地摄像头/麦克风');
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        message.log('摄像头/麦克风获取成功！');
        localVideo.srcObject = stream;
    } catch {
        message.error('摄像头/麦克风获取失败！');
        return;
    }

    message.log(`------ WebRTC ${target === 'offer' ? '发起方' : '接收方'}流程开始 ------`);
    message.log('将媒体轨道添加到轨道集');
    stream.getTracks().forEach(track => {
        peer.addTrack(track, stream);
    });

    if (!offerSdp) {
        message.log('创建本地SDP');
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);

        message.log(`传输发起方本地SDP`);
        socket.send(JSON.stringify(offer));
    } else {
        message.log('接收到发送方SDP');
        await peer.setRemoteDescription(offerSdp);

        message.log('创建接收方（应答）SDP');
        const answer = await peer.createAnswer();
        message.log(`传输接收方（应答）SDP`);
        socket.send(JSON.stringify(answer));
        await peer.setLocalDescription(answer);
    }
}
