
const apiURL = 'http://localhost:9494/api'
const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
}
const metadata: VideoMetadata = {
    data: {
        creator: 'OpenMediaShare',
        title: '',
        views: undefined,
        likes: undefined,
        thumbnail: 'https://cdn.discordapp.com/avatars/877743969503682612/a90d74f19a4e5b2319303f8c90b85405.webp?size=240',
        url: 'https://waterwolf.net',
        color: {}
    },
    time: {
        curruntTime: 0,
        totalTime: 0,
        timePercent: 0,
        formattedTime: '0w0'
    },
    auth: {
        name: 'Spicetify Client',
        service: 'spicetify',
        uuid: crypto.randomUUID()
    },
    requests: {}
}
let lastUpdate = Date.now();
let ws = new WebSocket('ws://localhost:9494')



async function main() {
    await fetch(`${apiURL}/auth/openSession`, {
        'headers': headers,
        'method': 'POST',
        'body': JSON.stringify(metadata)
    });


    Spicetify.Player.addEventListener('onplaypause', async (e) => {
        if (metadata.data.title === '') getVideoData(e);
        let state: PlayerState = 'unknown'; state = e?.data.isPaused ? 'paused' : 'playing' 
        metadata.data.playerState = state;
        await fetch(`${apiURL}/auth/main`, {
            'headers': headers,
            'method': 'POST',
            'body': JSON.stringify(metadata)
        });
        console.log('Play Pause');

        await fetch(`${apiURL}/controls/status`, {
            'headers': headers,
            'method': 'POST',
            'body': JSON.stringify({
                auth: metadata.auth,
                data: {state: state}
            })
        });
    })

    Spicetify.Player.addEventListener('songchange', async (e) => {
        console.log(e?.data);
        getVideoData(e);
    })

    Spicetify.Player.addEventListener('onprogress', async (e) => {
        if (metadata.data.title === '') {
            // Force Metadata Update
            Spicetify.Player.pause();
            Spicetify.Player.play();
        }
        console.log((Date.now() - lastUpdate) / 1000);
        if ((Date.now() - lastUpdate) / 1000 < 1){
            return 
        }

        const _tTime = Spicetify.Player.getDuration() / 1000;
        const _cTime = Spicetify.Player.getProgress() / 1000;
        const fct = secondsToFormat(_cTime); //formated current time
        const ftt = secondsToFormat(_tTime); //formated total time
        console.log(`${fct[0]}:${fct[1]} / ${ftt[0]}:${ftt[1]}`);
        metadata.time = {
            'curruntTime': _cTime,
            'totalTime': _tTime,
            'timePercent': (_cTime / _tTime) * 100,
            'formattedTime': `${fct[0]}:${fct[1]} / ${ftt[0]}:${ftt[1]}`
        };
        await fetch(`${apiURL}/media/all`, {
            'headers': headers,
            'method': 'POST',
            'body': JSON.stringify(metadata)
        });
        lastUpdate = Date.now()
        // await fetch(`${apiURL}/auth/openSession`,{'body': JSON.stringify(metadata),'method': 'POST'});
    })


    
}



async function getVideoData(e: Event & { data: Spicetify.PlayerState; } | undefined) {
    if (!e?.data) return
    metadata.data.title = e.data.item.name
    if (!e.data.item.artists) return
    metadata.data.creator = e.data.item.artists.map(a => a.name).join(', ');
    metadata.data.thumbnail = `https://i.scdn.co/image/${e.data.item.metadata.image_url.split(':')[2]}`
    metadata.data.url = 'https://waterwolf.net/404'
    metadata.data.color = Spicetify.colorExtractor(e.data.item.metadata.image_url)
    await fetch(`${apiURL}/media/all`, {
        'headers': headers,
        'method': 'POST',
        'body': JSON.stringify(metadata)
    });
}

function secondsToFormat(seconds: number) {
    const m = Math.round(Math.floor(seconds / 60));
    let s: string | number = Math.round(seconds - m * 60);
    if (s < 10) { s = `0${s}`; }
    return [m, s];
}

setInterval(async () => {
    if (ws === undefined || ws.readyState == 3){
        ws = new WebSocket('ws://localhost:9494')
    }
    if (ws.readyState == 1) return;
    await fetch(`${apiURL}/controls/${metadata.auth.uuid}/`, {
        'headers': headers,
    })
    .then(data => data.json())
    .then((data: VideoMetadata['requests']) => {
        if (data?.pause) Spicetify.Player.pause();
        if (data?.play) Spicetify.Player.play();
        if (data?.rewind) Spicetify.Player.back();
        if (data?.skip) Spicetify.Player.next();
        if (data?.volume) Spicetify.Player.setVolume(data.volume);
        if (data?.seek) Spicetify.Player.seek(data.seek * 1000) //convert from seconds to millcseonds
    })
},500)


ws.onopen = (ev) => {
    console.log('WEB SOCKET');
}

ws.onmessage = (ev) => {
    console.log(ev);
    const json = JSON.parse(ev.data);
    switch(json.event) {
        case 'playEvent': {
            Spicetify.Player.play();
            break;
        }
        case 'pauseEvent': {
            Spicetify.Player.pause();
            break;
        }
        case 'volumeChangeEvent': {
            Spicetify.Player.setVolume(json.volume);
            break
        }
        case 'seekChangeEvent': {
            Spicetify.Player.seek(json.seek * 1000)
            break
        }
        case 'rewindEvent': {
            Spicetify.Player.back();
            break;
        }
        case 'skipEvent': {
            Spicetify.Player.next();
            break;
        }
    }
    // alert('test');
    // ws.send('test');
};


export default main;
