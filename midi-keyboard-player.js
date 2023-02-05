let noteArray = [];
let volume = 1;
let piano;
let soundArray = [];
let sustain = false;
let sustainedArray = [];
let env;
let recording = false;
let recordingArray = [];

function preload() {
    //piano = loadSound('piano-C4.wav');
    // soundArray.push(loadSound('https://theremin.music.uiowa.edu/sound%20files/MIS/Piano_Other/piano/Piano.ff.A0.aiff'))
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    noStroke();
    textAlign(CENTER, CENTER);
    text('Click anywhere on page to start audio\n\nPress s to start/stop recording\n\nPress Ctrl+Shift+J to open the console for more detailed information', width/2, height/2);
    userStartAudio(); // enable audio playing as soon as user interacts with page

    // TODO: Use envelopes to get proper ADSR
    env = new p5.Envelope(0.0, 1, 10, 0);
    env.setExp(true);

    for (var i = 0; i < 128; i++) {
        noteArray.push(new p5.Oscillator(midiToFreq(i)));
        noteArray[i].start();
        noteArray[i].amp(0);
    }

    // Enable WebMidi.js and trigger the onWebMidiEnabled() function when ready
    WebMidi.enable()
        .then(onWebMidiEnabled)
        .catch(err => alert(err));

}

function onWebMidiEnabled() {
    // Check if at least one MIDI input is detected. If not, display warning and quit
    if (WebMidi.inputs.length < 1) {
        alert("No MIDI inputs detected.");
        return;
    }
    
    // Add a listener on all the MIDI inputs that are detected
    let keyboard = WebMidi.inputs[0];
    console.log(`%cFound midi input: ${keyboard._midiInput.name}`, "color: darkgreen; font-weight: bold; font-size: 20px; background-color: yellow");
    keyboard.addListener("midimessage", e => {
        // console.log(recording);
        switch (e.message.type) {
            case 'noteon':
                // console.log(e);
                // dataBytes -> [midiValueOfNote (0-127), keyPressStrength (0-127)]
                // data -> [statusByte, dataBytes[0], dataBytes[1]]
                console.log(e.dataBytes);
        
                if (e.dataBytes[0] === 7) {
                    outputVolume(e.dataBytes[1] / 127);
                    return;
                }
                
                // Add to sustainedArray if sustain pedal is pressed and key is released
                if (sustain) {
                    if (e.dataBytes[1] === 0) {
                        sustainedArray[e.dataBytes[0]] = true;
                        break;
                    }

                    // If it's already in the array, then it has just been re-pressed, so remove it from the array
                    if (sustainedArray[e.dataBytes[0]]) delete sustainedArray[e.dataBytes[0]];
                }
                

                // env.play(noteArray[e.dataBytes[0]]);

                // Play the note at a volume relative to how hard the key was pressed
                noteArray[e.dataBytes[0]].amp(e.dataBytes[1] / 127, 0.1);
                break;

            case 'controlchange':
                // console.log(e);
                switch (e.dataBytes[0]) {
                    case 7: // volume slider
                        outputVolume(e.dataBytes[1] / 127);
                        break;
                    case 64: // sustain pedal
                        sustain = !!e.dataBytes[1]; // e.dataBytes[1] = 127 if pedal pressed, else 0
                        if (!sustain) {
                            for (let i in sustainedArray) { // stop each note that was sustained
                                noteArray[i].amp(0, 0.1);
                            }
                            sustainedArray = []; // reset the array
                        }
                        break;
                    default:
                        console.log('controlchange', e.dataBytes);
                }
                break;

            case 'programchange': // instrument change
                console.log('programchange', e.dataBytes);
                break;
            case 'clock':
                if (recording) {
                    let frame = {timestamp: e.timestamp, notes: []};
                    for (let i in noteArray) {
                        // Add an empty gap if there is no amplitude for playback optimisation
                        let amp = noteArray[i].getAmp();
                        if (amp || recordingArray.at(-1)?.notes[i]) frame.notes.push(amp);
                        else frame.notes.length++;
                    }
                    recordingArray.push(frame);
                    if (recordingArray.length > 20000) {
                        recording = false;
                        alert('Recording automatically stopped because it is too long!\nPress p to play');
                    }
                }
                break;
            default:
                console.log('UNKNOWN MESSAGE TYPE: ' + e.message.type);
        }
    });
}

// TODO: Make this function asynchronous
function playRecording() {
    let diff = performance.now() - recordingArray[0].timestamp;
    let len = recordingArray.length;

    let frameIndex = 0;
    while (frameIndex < len) {
        if (performance.now() - diff > recordingArray[frameIndex].timestamp) {
            for (let i in recordingArray[frameIndex].notes) {
                noteArray[i].amp(recordingArray[frameIndex].notes[i]);
            }
            frameIndex++;
        }
    }
    
    // Reset all keys to 0 amplitude if they were playing when recording finished
    for (let i in noteArray) {
        noteArray[i].amp(0);
    }
}

function keyPressed(e) {
    if (e.key.toLowerCase() === 's') {
        let doRec = true;
        if (!recording) {
            doRec = confirm('Begin recording? This will delete any previous recording');
            if (doRec) recordingArray = [];
        }
        else alert('Recording complete! Press p to play');
        if (doRec) recording = !recording;
    }
    if (e.key.toLowerCase() === 'p') playRecording();
}
