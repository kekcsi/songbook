var seqr //interval timer object of the music sequencer
var tickms //tick length in milliseconds
var song = 0 //index of the selected song
var level = 1 //current level of progress in the selected song 
var levels = 1 //number of levels in total for this song
var cursor = { index: 0, tick: 0 } //sequencer current position in song
var anim //interval timer for animation frames
var anim_ms = 20 //animation frame duration in milliseconds
var btn = null //the button element object that is highlighted
var fly = null
var key_coords = { 
    "0b": [0, 20],
    "1c": [4, 20],
    "1d": [4*2, 20],
    "1e": [4*3, 20],
    "1f": [4*4, 20],
    "1g": [4*5, 20],
    "1a": [4*6, 20],
    "1b": [4*7, 20],
    "2c": [4*8, 20],
    "2d": [4*9, 20],
    
    "1cs": [-2 + 4*2, 8],
    "1ds": [-2 + 4*3, 8],
    "1fs": [-2 + 4*5, 8],
    "1gs": [-2 + 4*6, 8],
    "1as": [-2 + 4*7, 8],
    "1cs": [-2 + 4*9, 8]
}
var displace = -20.375

function selsong() {
    songlist.style.display = "block"
    keyboard.style.display = "none"

    if(seqr) {
        clearInterval(seqr)
    }
    if(btn) { 
        btn.style.backgroundImage = "" 
        btn.style.backgroundColor = "rgb(128, 128, 128)"
    }
    if(fly) {
        fly = null
        var elem = document.getElementById("fly")
        elem.style.display = "none"
    }
}

function onResize() {
    //zoom to fill body element
    var bw_px = document.body.offsetWidth
    var bh_px = document.body.offsetHeight
    var w_em = 40
    var h_em = 25
    var px_per_em = ((bw_px/bh_px > w_em/h_em)?bh_px/h_em:bw_px/w_em)
    document.body.style.fontSize = Math.min(18, px_per_em) + "px"
}

function onLoad() {
    onResize()
    
    for(var s = 0; s < songs.length; s++) {
        var img = document.createElement("img")
        img.setAttribute("src", songs[s].thumb)
        img.setAttribute("alt", songs[s].thumb)
        img.addEventListener("click", 
            (function(s) { 
                return function() {
                    teachsong(s)
                }
            })(s)
        )
        songlist.appendChild(img)
    }
    
    selsong()
    
    var elem = document.getElementById("fly")

    elem.addEventListener("click", function() {
        // continue sequencing
        fly = null
        elem.style.display = "none"
        if(dotick()) {
            seqr = setInterval(dotick, tickms)
        }

        if(tickms >= 200) {
            tickms-=50
        }
    })

    anim = setInterval(function() {
        if(btn) {
            btn.style.backgroundPositionX = parseInt(btn.style.backgroundPositionX) + 3 + "px"
        }
        
        if(fly) {
            var elem = document.getElementById("fly")
            elem.style.marginLeft = fly.pos[0] + displace + "em"
            elem.style.top = fly.pos[1] - .375 + "em"
            
            if(Math.abs(fly.target[0] - fly.pos[0]) > Math.abs(fly.speed[0])) {
                fly.pos[0] += fly.speed[0]
                fly.pos[1] += fly.speed[1]
            } else {
                fly.pos[0] = fly.target[0]
                fly.pos[1] = fly.target[1]
                
                if(tickms < 500) {
                    tickms++
                } else {
                    level = 1
                }
            }
        } else {
            for(var k in key_coords) {
                var elem = document.getElementById("btn_" + k)
                grps = elem.style.backgroundColor.match(/rgb\((.*),.*,.*\)/) 
                 
                if(grps) {
                    var y = parseInt(grps[1])
                    if(y > 0 && y < 255) {
                        var spd = Math.round(500/tickms)
                        if(k.endsWith('s')) {
                            // fade to black
                            y-=spd
                        } else {
                            // fade to white
                            y+=spd
                        }
                        elem.style.backgroundColor = "rgb(" + y + "," + y + "," + y + ")"
                    }
                }
            }
        }
        
        displaydiv.innerHTML = level+ "/" + tickms //TODO: remove this
    }, anim_ms)
}

function teachsong(i) {
    song = i
    tickms = 300
    level = 1
    levels = 1
    cursor = { index: 0, tick: 0 }
    btn = null
    fly = null
    songlist.style.display = "none"
    keyboard.style.display = "block"
    seqr = setInterval(dotick, tickms)
}

function dotick() {
    if(cursor.tick == 0) {
        var pitch = songs[song].pitch[cursor.index]

        // highlight a different key from now
        if(btn) { 
            btn.style.backgroundImage = "" 
            btn.style.backgroundColor = "rgb(128, 128, 128)"
        }
        btn = document.getElementById("btn_" + pitch)
        btn.style.backgroundImage = "url(rainbow.png)"
        btn.style.backgroundPositionX = 100*cursor.index + "px"

        // calculate highest level while playing
        levels = Math.max(levels, songs[song].level[cursor.index])

        if(fly) {
            // before playing this note, stop sequencer until the user hits the fly
            clearInterval(seqr)
            seqr = null
            return true
        }

        // start playing a note
        var au = document.getElementById("au_" + pitch)
        au.currentTime = 0.0
        au.play()
    }

    // advance cursor
    if(cursor.tick < songs[song].time[cursor.index] - 1) {
        // hold the current note for one more tick
        ++cursor.tick
    } else {
        cursor.tick = 0
        if(cursor.index < songs[song].pitch.length - 1) {
            // play next note in the next tick
            ++cursor.index
        } else {
            // end of song
            if(level <= levels) {
                ++level
            } else {
                // end teaching this song
                clearInterval(seqr)
                seqr = null
                levels = 1
                btn.style.backgroundImage = ""
                au_celebrate.play()
                songlist.style.display = "block"
                keyboard.style.display = "none"
            }
            cursor.index = 0
            return false
        }
    }

    // does fly come in next tick?
    if(cursor.tick == 0 && songs[song].level[cursor.index] <= level) {
        fly = { target: key_coords[songs[song].pitch[cursor.index]] }
        if(fly.target[0] > key_coords["1fs"][0]) {
            // from left to right
            fly.pos = [-5, -5]
        } else {
            // from right to left
            fly.pos = [40, -5]
        }
        fly.speed = [
            (fly.target[0] - fly.pos[0])/tickms*anim_ms,
            (fly.target[1] - fly.pos[1])/tickms*anim_ms
        ]

        var elem = document.getElementById("fly")
        elem.style.display = "block"
    }
    
    return true
}