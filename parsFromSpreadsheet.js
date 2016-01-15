/* ///
// This anonymous function parses the key parameter from the document location url. If a key is present,
// it uses that key to try to extract data from the first 50 cells in the first two columns 
// in the second worksheet of the Google Spreadsheet to which the key belongs, using a json 
// query with a callback function. If no key is present, it tries to load the javascript file
// indicated in the js parameter from the document location url or constructed from the url.
// Other parameters in the document location url that correspond to id's of the last form in the
// page are used to fill out those respective form input elements with the url encoded values.
//
// The format assumed in retrieving data from the Google Spreadsheet is that values in the first 
// column are considered to be the names of global variables, and values in the second column
// are considered to be their values.
//
// If an input element exists with the id 'browser' information about the client (the userAgent 
// string which has all info about the computer & browser available) is stored in this
// input field, along with the browser window dimensions. Also, and an attempt is made,
// to store the ip-address of the client computer (using jsonip micro service). The script can also 
// collect the geolocations, but this is switched off to prevent a privacy message to pop up.
//
// If an input element exists with the id 'screen', all screen parameters (available height & width, 
// etc.) are stored in it's value.
// 
//
// Side effect: The function _paramsFromSpreadsheetCallback is created and global variables 
//              are created that are specified in the first column of the spreadsheet. After
//              loading these variables a script-tag is attached to the document header, dy-
//              namically loading a javascript file. The path to this script file is obtain
//              from the document location by replacing the extention with ".js" (note that
//              this doesn't work with redirects and is likely to change), or it is parsed
//              from the document location search parameter 'js'. Two global functions are
//              created: _paramsFromSpreadsheetCallback and _getip.
//              
// Return value: none.
//
// Copyright (2011) Raoul Grasman.
// License: This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License. 
//          To view a copy of this license, visit http://creativecommons.org/licenses/by-sa/4.0/.
// // */
(function(){
    var DEBUG = false;
    var Dl = document.location;
    if (!document.head) {
        document.head = document.getElementsByTagName("head")[0];
    }

    // prepare loading data from spreadsheet
    var urlroot = "http://spreadsheets.google.com/feeds/cells/", 
        urltail = "/2/public/values?alt=json-in-script&callback=_paramsFromSpreadsheetCallback&range=A1:B50";
    var key = Dl.search.match(/[?&]key=([^&]+)/g) || false;
    if (key && key.length > 0) {
        key = key[0];
        key = key.replace(/^[?&]key=/,"");
    }
    var scr = document.createElement("script");
    scr.src = urlroot + key + urltail;

    // prepare loading script file
    var js = Dl.search.match(/[?&]js=([^&]+)/g) || [Dl.href.replace(/\.\w+(\?.+)?$/,".js")];
    if (js.length > 0) {
        js = js[0];
        js = js.replace(/^\w+:\/\/[^\/]+/g,""); // implement same origin policy
    }
    var tscr= document.createElement("script");
    tscr.src= js + (DEBUG ? "?rnd=" + Math.random() : "");
    var self = this;
    
    // define callback function
    window["_paramsFromSpreadsheetCallback"] = function(obj){
        spreadsheet = {};
        spreadsheet.data = obj;
        var entries = obj.feed.entry, data = [];
        for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];
            var name = entry.title.$t;
            var value = entry.content.$t.replace(/^\s*|\s*$/g,"").replace(/\n/g,"\\n");
            data[name] = value;
        }
        for (var i = 0; i < entries.length; i++) {
            try {
                window[data['A' + i]] = eval(data['B' + i]);
            }
            catch (e) {}
        }
        document.head.appendChild(tscr);
    }

    // define function to alter the form behavior
    var prepareForm = function() {
        // Create hidden iframe as a target for the form submission
        var ifr = document.createElement("iframe");
        ifr.src = "about:blank";
        ifr.style.display = "none";
        ifr.setAttribute("id", "target_" + key);
        ifr.setAttribute("name", ifr.id);
        document.body.appendChild(ifr);
        
        // Change key in form action
        var Form = document.forms;
        if (Form.length < 1) {
            throw new Error("There's no form on the page");
        }
        else Form = Form[Form.length - 1]; // The last form is the storage form (subject to change!)
        var fkey = Dl.search.match(/[?&]formkey=([^&]+)/g) || false;
        if (fkey && fkey.length > 0) {
            fkey = fkey[0];
            fkey = fkey.replace(/^[?&]formkey=/,"");
        }
        Form.action = Form.action.replace(/formkey=[^&]+/g, "formkey=" + fkey);
        Form.target = ifr.id;
        if (Form.browser) {
            Form.browser.value += [navigator.userAgent, "width: "+document.width, "height: "+document.height].join("; ") 
            Form.browser.value += "; ";
        }
        var S = "";
        for (var r in screen) {
            S += r + ": " + screen[r] + "; ";
        }
        if (Form.screen)
            Form.screen.value = S;
        
        // fill out form input values provided in search part of the URL
        var pairs = Dl.search.replace(/^\?/,"");
        pairs = pairs.split(/\&/g);
        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i].split(/=/);
            if (pair.length == 2 && Form[pair[0]]) {
                Form[pair[0]].value += pair[1] + " ";
            }
        }
    }
    
    // where possible, record geolocation
    var registerGeoLocation = function(loc) {
        var s = "";
        try {
            if (loc.coords) {
                s  = "geo: " + loc.coords.longitude + " " + loc.coords.latitude;
                s += " ("    + loc.coords.accuracy + ") t" + loc.timestamp + "; ";
            }
            else {
                s = "ip: " + (loc.ip || "NA") + "; ";
            }
        } catch(e) {}
        var Form = document.forms;
        if (Form.length < 1) {
            throw new Error("There's no form on the page");
        }
        else Form = Form[Form.length - 1]; // The last form is the storage form (subject to change!)
        try {
            Form.browser.value += s; 
        } catch(e) {}
    }
    if (navigator.geolocation && false) {
        navigator.geolocation.getCurrentPosition(registerGeoLocation,function(e){});
    } 
    
    // try to record the IP address (and hostname)
    try {
        var ipscr = document.createElement("script");
        /*
        ipscr.src = "http://scripts.hashemian.com/js/visitorIPHOST.js.php"; // publishes IP address
        window["VIH_DisplayOnPage"] = "no";
        setTimeout(function() {try{
            var Form = document.forms; 
            Form[Form.length - 1].browser.value += "; ip: " + VIH_HostIP;
        } catch(e) {}}, 30 * 1000);
        */
        ipscr.src = "http://jsonip.appspot.com/?callback=_getip";
        window["_getip"] = registerGeoLocation;
        document.head.appendChild(ipscr);
    } catch(e) {}
    
    // load data or script file
    if (key) {
        window.onload = function() { document.head.appendChild(scr); prepareForm(); }
    }
    else {
        window.onload = function() { document.head.appendChild(tscr); prepareForm(); }
    }

})()