/* //
// Copyright (2011) Raoul Grasman.
// License: This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License. 
//          To view a copy of this license, visit http://creativecommons.org/licenses/by-sa/4.0/.
// // */

_ifndef = function(name, value){ window[name] = window[name] || value;}

_ifndef("PUMP_ID", "pump"); 
_ifndef("BALLOON_ID", "balloon"); 
_ifndef("SCORE_FIELD_ID", "score"); 
_ifndef("TOTAL_EARNED_ID", "totalEarned"); 
_ifndef("LAST_BALLOON_ID", "lastBalloon"); 
_ifndef("LAST_BALLOON_TEXT_ID", "lastBalloonText");
_ifndef("TOTAL_EARNED_TEXT_ID", "totalEarnedText");
_ifndef("COLLECT_BUTTON_ID", "collectBut"); 

_ifndef("INFLATE_AUDIO_PLAYER_ID", "inflateSound"); 
_ifndef("INFLATE_AUDIO_PLAYER_ID2", "inflateSoundX"); 
_ifndef("POP_AUDIO_PLAYER_ID", "popSound"); 
_ifndef("POP_AUDIO_PLAYER_ID2", "popSoundX"); 
_ifndef("PAY_AUDIO_PLAYER_ID", "paySound"); 
_ifndef("PAY_AUDIO_PLAYER_ID2", "paySoundX"); 

_ifndef("INSTRUCTION_DIV_ID", "instruction");
_ifndef("START_BUTTON_ID", "nextBut");
_ifndef("INSTRUCTION_HTML", "<h2>Uitleg van het spel</h2><p>Zo meteen ga je balonnen opblazen door op de pomp te klikken. Je mag zo vaak pompen als je wil, maar je hebt kans dat de balon knapt als je te vaak pompt. Voor iedere keer dat je pompt kun je &euro; 0,05 krijgen, als de balon tenminste niet knapt. Als je niet verder wil pompen klik je op de gele knop.</p><p>Klik op OK om te beginnen.</p>"); 
_ifndef("THANKS_HTML", "<h2>Klaar</h2> <p>Bedankt voor het mee doen!</p>");
_ifndef("CURRENCY", "\u20ac");
_ifndef("TOTAL_EARNED_TEXT", "Totaal Verdiend");
_ifndef("LAST_BALLOON_TEXT", "Voor Laatste Ballon");

_ifndef("AMOUNT_REWARD_PER_PUFF", 0.05);  // in monetairy units;
_ifndef("BALLOON_POP_PROBABILITY", 0.05); 
_ifndef("INITIAL_BALLOON_WIDTH", 50); 
_ifndef("POPPED_BALLOON_WIDTH", 5); 
_ifndef("TRIAL_ONSET_ASYNC", 3000);  // msec;
_ifndef("BALLOON_COLORS", ["yellow", "yellow", "yellow", "yellow", "yellow", "yellow", "yellow", "yellow", "yellow", "yellow", "blue", "blue", "blue", "blue", "blue", "blue", "blue", "blue", "blue", "blue", "orange", "orange", "orange", "orange", "orange", "orange", "orange", "orange", "orange", "orange"]);
_ifndef("BALLOON_COLOR_MAX_PUFFS", {red: 32, yellow: 32, orange: 8, blue: 128}); // max puffs per balloon color
_ifndef("NRTRIALS", BALLOON_COLORS.length);

_ifndef("NR_ANIMATION_FRAMES_PER_PUFFS", 20);  // the number of frames in which the balloon inflates with one puff
_ifndef("NR_PIXEL_INCREASE_PER_PUFF", 110);  // the number of pixels increase by each puff
_ifndef("ANIMATION_FRAME_DURATION", 16 + 2/3);  // the duration of one animation video frame in msec
_ifndef("CASHING_AMOUNT_STEP", AMOUNT_REWARD_PER_PUFF / 5);  // in monetairy units
_ifndef("CASHING_FRAME_TIME", 16 + 2/3);  // duration of cashing update video frame in msec


var Bart = (function(){
    var pump, balloon, balloonWidth, inflateSound, popSound, paySound,
        lastBalloon, lastBalloonElem, totalEarned, totalEarnedElem, 
        collectBut, instructDiv, Record = [], Form;

    function $(name) {return document.getElementById(name);}
    
    function init() {
        var dummyPlayer = {play: function(){}, pause: function(){}};
        var s = 0;
        try {
            Form = document.forms;
            if (Form.length < 1) {
                throw new Error("There's no form on the page");
            }
            else Form = Form[Form.length - 1]; // The last form is the storage form (subject to change!)

            pump = $(PUMP_ID); 
            balloon = $(BALLOON_ID); 
            lastBalloonElem = $(LAST_BALLOON_ID); 
            totalEarnedElem = $(TOTAL_EARNED_ID); 
            collectBut = $(COLLECT_BUTTON_ID);   
            instructDiv = $(INSTRUCTION_DIV_ID);
            startButton = $(START_BUTTON_ID);

            inflateSound = $(INFLATE_AUDIO_PLAYER_ID) 
            if (!inflateSound.play) 
                inflateSound = $(INFLATE_AUDIO_PLAYER_ID2) || dummyPlayer; 
            popSound = $(POP_AUDIO_PLAYER_ID);
            if (!popSound.play)
                popSound = $(POP_AUDIO_PLAYER_ID2) || dummyPlayer;
            paySound = $(PAY_AUDIO_PLAYER_ID);
            if (!paySound.play)
                paySound = $(PAY_AUDIO_PLAYER_ID2) || dummyPlayer; 


            instructDiv.children[0].innerHTML = INSTRUCTION_HTML;
            collectBut.innerHTML = CURRENCY + CURRENCY + CURRENCY;
            var sh = document.createElement('style');
            sh.innerHTML = '#totalEarned:before, #lastBalloon:before {content: "' + CURRENCY + ' ";}'
			document.body.appendChild(sh);
            startButton.onclick = hideInstruction;
            
            lastBalloon = totalEarned = 0; 
            $(LAST_BALLOON_TEXT_ID).innerHTML = LAST_BALLOON_TEXT;
            $(TOTAL_EARNED_TEXT_ID).innerHTML = TOTAL_EARNED_TEXT;
            BALLOON_COLORS.sort(function(){return Math.random() - 0.5;});

            initBalloon(); 
            activatePump(); 
            activateCollectBut(); s++

        }
        catch (e) {
            alert("Initialization error: " + (e.description || e) + "\ns: "+s);
        } 
    }
    function initBalloon() {
        recordAnswer();
        if (BALLOON_COLORS.length > 0) {
            balloonWidth = INITIAL_BALLOON_WIDTH;
            balloon.width = Math.round(INITIAL_BALLOON_WIDTH);
            // BALLOON_COLORS.sort(function(){return Math.random() - 0.5;});
            balloon.style.backgroundColor = BALLOON_COLORS.pop(); //BALLOON_COLORS[0];
            lastBalloon = 0;
            activatePump();
            activateCollectBut(); 
            try{
                paySound.pause(); 
                popSound.pause();
            } catch (e) {};
        }
        else {
            end();
        }
    }
    function activatePump() {
        pump.onclick = inflateBalloon;
        pump.style.cursor = "pointer";
        pump.children[0].style.display = "";
        pump.children[1].style.display = "none";
        pump.children[2].style.display = "none";
    }
    function deactivatePump() {
        pump.onclick = null;
        pump.style.cursor = "wait";
        pump.children[0].style.display = "none";
        pump.children[1].style.display = "";
        pump.children[2].style.display = "none";
    }
    function activateCollectBut() {
        collectBut.onclick = collect$$$;
    }
    function deactivateCollectBut() {
        collectBut.onclick = null;
    }
    function hideInstruction() {
        instructDiv.style.visibility = "hidden";
    }
    function showInstruction() {
        instructDiv.style.visibility = "visible";
    }

    function inflateBalloon() {
        function addPuff() {
            var d = NR_PIXEL_INCREASE_PER_PUFF / NR_ANIMATION_FRAMES_PER_PUFFS;
            balloonWidth = Math.sqrt(balloonWidth * balloonWidth + d * d) ;
            if (balloon && balloon.width) {
                balloon.width = Math.round(balloonWidth);
            }
        }
        deactivatePump();
        try {
           inflateSound.play();
        } catch(e) {}
        if (balloonShouldPop()) {
            var i;
            lastBalloon = 0;
            lastBalloonElem.innerHTML = formatAmount(lastBalloon);
            for (i = 0; i < NR_ANIMATION_FRAMES_PER_PUFFS / 2; i++)
                setTimeout(addPuff, i * ANIMATION_FRAME_DURATION);
            setTimeout(balloonPop, ++i * ANIMATION_FRAME_DURATION);
        }
        else {
            lastBalloon++;
            for (var i = 0; i < NR_ANIMATION_FRAMES_PER_PUFFS; i++)
                setTimeout(addPuff, i * ANIMATION_FRAME_DURATION);
            setTimeout(activatePump, ++i * ANIMATION_FRAME_DURATION);
        }
    }
    
    function balloonShouldPop() {
        var curBallCol = balloon.style.backgroundColor;
        if (BALLOON_COLOR_MAX_PUFFS && BALLOON_COLOR_MAX_PUFFS[curBallCol]) {
            return Math.random() < 1 / (BALLOON_COLOR_MAX_PUFFS[curBallCol] - lastBalloon); 
        }
        else {
            return Math.random() < BALLOON_POP_PROBABILITY;
        }
    }
    function collect$$$() {
        if (lastBalloon == 0)
            return 0;
        else totalEarned += lastBalloon;
        deactivateCollectBut();
        deactivatePump();
        pump.children[0].style.display = "none";
        pump.children[1].style.display = "none";
        pump.children[2].style.display = "";
        var decrem = round(CASHING_AMOUNT_STEP / AMOUNT_REWARD_PER_PUFF, 4);
        function updateTotal(value) {
            if(value >= 0) {
                try {
                    paySound.play();
                } catch (e) {}
                totalEarnedElem.innerHTML = formatAmount((totalEarned - value) * AMOUNT_REWARD_PER_PUFF);
                lastBalloonElem.innerHTML = formatAmount((lastBalloon - value) * AMOUNT_REWARD_PER_PUFF);
                setTimeout(function(){updateTotal(round(value - decrem,4));}, CASHING_FRAME_TIME);
            }
            else {
                setTimeout(initBalloon, TRIAL_ONSET_ASYNC);
            }
        }
        updateTotal(lastBalloon + decrem);
    }
    function balloonPop() {
        try {
            inflateSound.pause();
            popSound.play();
        } catch (e) {}
        balloon.width = POPPED_BALLOON_WIDTH;
        setTimeout(initBalloon, TRIAL_ONSET_ASYNC);
    }
    function recordAnswer() {
        var rec = "";
        rec += 'tr:' + (NRTRIALS - BALLOON_COLORS.length) +';cl:' + balloon.style.backgroundColor + ';';
        rec += 'lb:' + lastBalloon + ';te:' + totalEarned;
        Record.push(rec);
    }
    function end() {
        instructDiv.innerHTML = THANKS_HTML;
        showInstruction();
        var s = "";
        Estimates = s;
        try {
            if (Form.trial_record)
                Form.trial_record.value = Record.join("|\n");
            if (Form.estimates)
                Form.estimates.value   = Estimates;
        } catch (e) {}
        Form.submit.click();
        return false;
    }

    function formatAmount(amount) {
        amount = round(amount, 4);
        var v = (amount + 0.0001).toString()
        return v.replace(/\.(\d{2}).+/,".$1");
    }
    function round(value, n) {
        var k = Math.pow(10, n);
        return Math.round(k * value) / k;
    }

    if (document.readyState == "complete") {
        init();
    }
    else {
        window.onload = init;
    }
})()