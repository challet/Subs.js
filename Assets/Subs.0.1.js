
/*
---
description: Base MooPlay object, useful but not really interesting

license: GNU GPL

authors:
- Clément Hallet

requires:
- core/1.2.4: [Core, Element, Element.Event, Element.Style, Class, Class.Extra.Events, Class.Extra.Options]

provides: 
- MooPlay
- MooPlay.Subtitle
- MooPlay.Subtitle.Parser
- MooPlay.Control
- MooPlay.Display

...
*/


Element.NativeEvents = $merge(Element.NativeEvents, {
    loadstart: 2,
    progress: 2,
    suspend: 2,
    abort: 2,
    error: 2,
    emptied: 2,
    stalled: 2,
    play: 2,
    pause: 2,
    loadedmetadata: 2,
    loadeddata: 2,
    waiting: 2,
    playing: 2,
    canplay: 2,
    canplaythrough: 2,
    seeking: 2,
    seeked: 2,
    timeupdate: 2,
    ended: 2,
    ratechange: 2,
    durationchange: 2,
    volumechange: 2
});

var MooPlay = {
    Subtitle: {
        Parser: {}
    },
    Control: {},
    Display: {}
};
/*
---
description: some utility functions

license: GNU GPL

authors:
- Clément Hallet

requires:
- MooPlay

provides: 
- MooPlay.Utils

...
*/

MooPlay.Utils = {
    /**
     *  @param srt_time : format is '00:02:52,406'
     */
    sexagesimalToTimestamp: function(srt_time) {

        return ((srt_time.h * 60 + srt_time.m) * 60 + srt_time.s) * 1000 + srt_time.ms;

    },

    /**
     *  @return format is '00:02:52,406'
     */
    timestampToSexagesimal: function(timestamp) {

        var ms = timestamp.floor();
        var s = (ms / 1000).floor() ;
        var m = (s / 60).floor();
        var h = (m / 60).floor();

        return {
            h: h,
            m: m % 60,
            s: s % 60,
            ms: ms % 1000
        };

    },
    
    readable: function(srt_time) {
        
        srt_time.m = String(srt_time.m).pad(2,'0');
        srt_time.s = String(srt_time.s).pad(2,'0');
        srt_time.ms = String(srt_time.ms).pad(3,'0');
        
        return srt_time;
        
    }
    
    
}

//+ Jonas Raoni Soares Silva
//@ http://jsfromhell.com/string/pad [rev. #1]

String.prototype.pad = function(l, s, t){
    return s || (s = " "), (l -= this.length) > 0 ? (s = new Array(Math.ceil(l / s.length)
        + 1).join(s)).substr(0, t = !t ? l : t == 1 ? 0 : Math.ceil(l / 2))
        + this + s.substr(0, l - t) : this;
};/*
---
description: object representation of a subtitle line

license: GNU GPL

authors:
- Clément Hallet

requires:
- MooPlay

provides: 
- MooPlay.Subtitle.Item

...
*/


MooPlay.Subtitle.Item = new Class({
    
    initialize: function(start, end, texts) {
        
        this.start = start;
        this.end = end;
        this.element = new Element('div');
        texts.each(function(text) {
            this.element.grab(
                new Element('p').appendText(text)
            );
        }.bind(this));
        
    },
    
});
/*
---
description: hash tree store for subtitles

license: GNU GPL

authors:
- Clément Hallet

requires:
- MooPlay
- MooPlay.Subtitle.Item

provides: 
- MooPlay.Subtitle.Tree

...
*/


MooPlay.Subtitle.Tree = new Class({
    
    nb_childs: 2,
    
    children: [],
    subs: [],
    
    initialize : function(start, end) {
        this.start = start;
        this.end = end;
    },
    
    buildChildren: function() {

       var child_period = Math.ceil((this.end - this.start) / this.nb_childs); 

       for (var i = 0; i < this.nb_childs; i++) {
           this.children.push(new MooPlay.Subtitle.Tree(
               this.start + i * child_period, // start
               this.start + (i + 1) * child_period // end
           ));
       }
   },
    
    getChildren: function(even_empty) {
        if(this.children.length == 0 && even_empty) {
            this.buildChildren();
        }
        return this.children;
    },
    
    doesSubtitleFit: function(sub) {
        return sub.start >= this.start && sub.end <= this.end;
    },
    
    addSub: function(sub) {
        
        var fit_in_one_child = false;
        this.getChildren(true).each(function(child) {
            if(child.doesSubtitleFit(sub)) {
                fit_in_one_child = true;
                child.addSub(sub);
            }
        }.bind(this));
        
        if(this.doesSubtitleFit(sub) && !fit_in_one_child) {
            this.subs.push(sub);
        }
    },
    
    getSubs: function(timestamp) {
        
        if(timestamp < this.start && timestamp >= this.end) {
            return [];
        }

        var subs = [];
        
        this.subs.each(function(sub) {
            if(timestamp >= sub.start && timestamp < sub.end) {
                subs.push(sub);
            }
        });
        
        this.getChildren(false).each(function(child) {
            if(timestamp >= child.start && timestamp <= child.end) {
                subs.extend(child.getSubs(timestamp));
            }
        });
        
        return subs;
    }

});
/*
---
description: ajax-loading subtitles and routing to the right parser

license: GNU GPL

authors:
- Clément Hallet

requires:
- MooPlay
- MooPlay.Subtitle.Item
- MooPlay.Subtitle.Tree

provides: 
- MooPlay.Subtitle.Loader

...
*/

MooPlay.Subtitle.Loader = new Class({
    
    Implements: [Options],
    
    initialize: function(url, options) {
        this.url = url;
        this.setOptions(options);
        this.load();
    },

    load: function() {
        var request = new Request({
            url: this.url,
            method: 'get',
            onSuccess: this.run.bind(this)
        });
        request.send({});
    },
    
    run: function (data) {
        var parser = this.selectParser();
        return new parser(data, {onComplete: this.options.onComplete});
    },
    
    selectParser: function() {
        var ext = this.url.split('.').pop();
        switch(ext) {
            case 'srt':
                return MooPlay.Subtitle.Parser.SubRip;
            break;
            case 'sub':
                return MooPlay.Subtitle.Parser.SubViewer;
            break;
            default:
                throw 'the ' + ext + ' format is not known or supported as a subtitle file';
            break;
        }
    }
    
});
/*
---
description: diplay subtitles synchronised with a video element

license: GNU GPL

authors:
- Clément Hallet

requires:
- MooPlay
- MooPlay.Subtitle.Item
- MooPlay.Subtitle.Tree

provides: 
- MooPlay.Subtitle.Player

...
*/


MooPlay.Subtitle.Player = new Class({

    Implements: [Options],

    options: {
        subs_hash: null,
        tick_delay: 100, // not in use for now
        time_shift: 0,
        onDispose: function(element, container, overlapping) {
            element.dispose();
            sub.element.removeClass('overlapping' + String(overlapping));
        },
        onDisplay: function(element, container, overlapping) {
            element.addClass('overlapping' + String(overlapping));
            element.inject(container, 'bottom');
        }
    },

    initialize: function( video, container, options) {

        this.setOptions(options);
        
        this.video = $(video);
        this.container = $(container);
        
        if(this.options.subs_hash != null) {
            this.loadSubtitles(this.options.subs_hash);
        }

        this.overlapping_level = 0;
        this.displayed = [];

        this.video.addEvent('timeupdate', function(event) {
            if(this.subs_hash != null || this.displayed.length != 0) {
                this.tick(event.target.currentTime * 1000);
            }
        }.bind(this));
    
    },
    
    loadSubtitles: function(subs_hash) {
        this.unLoad();
        this.subs_hash = subs_hash;
    },
    
    unLoad: function() {
        this.subs_hash = null;
    },
  
    tick: function(abs_movie_time) {

        var next_displayed = this.subs_hash != null ? this.subs_hash.getSubs(abs_movie_time - this.options.time_shift) : [];
        
        // remove subs which are not here anymore
        this.displayed.each(function(sub) {
            var displayed = [];
            if(!next_displayed.contains(sub) || this.subs_hash == null) {
                this.options.onDispose(sub.element, this.container, --this.overlapping_level);
            } else {
                displayed.push(sub);
            }
            this.displayed = displayed;
        }.bind(this));
        
        // display subs which should to
        next_displayed.each(function(sub) {
            if(!this.displayed.contains(sub)) {
                
                this.displayed.push(sub);
                this.options.onDisplay(sub.element, this.container, this.overlapping_level++);
            }
        }.bind(this));

    },
    
    setTimeShift: function(shift) {
        this.options.time_shift = parseInt(shift);
    }
    

});
/*
---
description: base class for ajax-loading and parsing subtitles file

license: GNU GPL

authors:
- Clément Hallet

requires:
- MooPlay
- MooPlay.Subtitle.Item
- MooPlay.Subtitle.Tree

provides: 
- MooPlay.Subtitle.Parser.Base

...
*/

MooPlay.Subtitle.Parser.Base = new Class({
    
    Implements: [Options],
    
    options: {
        onComplete: $empty
    },
    
    initialize: function(data, options) {
        this.setOptions(options);
        this.hash(
            this.parse(data)
        );
        
        this.options.onComplete(this.hash_root);
        
    },
    
    hash: function(subs) {
        
        var abs_start = Infinity;
        var abs_end = 0;
        subs.each(function(sub) {
            abs_start = Math.min(abs_start, sub.start);
            abs_end = Math.max(abs_end, sub.end);
        });
        
        this.hash_root = new MooPlay.Subtitle.Tree(abs_start, abs_end);

        subs.each(function(sub) {
            this.hash_root.addSub(sub);
        }.bind(this));
        
    }

});
/*
---
description: specific class for parsing subtitles file in SubRip format (.srt)

license: GNU GPL

authors:
- Clément Hallet

requires:
- MooPlay
- MooPlay.Utils
- MooPlay.Subtitle.Parser.Base
- MooPlay.Subtitle.Item

provides: 
- MooPlay.Subtitle.Parser.SubRip

...
*/


MooPlay.Subtitle.Parser.SubRip = new Class({

    Implements: MooPlay.Subtitle.Parser.Base,
    
    regexps: {
        new_sub: /^(\d+)$/,
        time: /^(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})$/,
        text: /^(.+)$/
    },
    
    options: {
        srt_end_of_line: '\n',
        onComplete: $empty
    },

    parse: function(data) {
    
        var subs = [];
        var current_sub = null;
        var current_text = null;
        var index = null

        var lines = data.split(this.options.srt_end_of_line);
        // in case file doesn't end with an empty line
        lines.push('');

        do {

            var line = lines.shift();

            if(this.regexps.new_sub.test(line)) {
                current_text = [];
                current_sub = {};
            } else if(line != null && this.regexps.time.test(line)) {
                var times = this.regexps.time.exec(line);
                current_sub.start = MooPlay.Utils.sexagesimalToTimestamp({ h: times[1].toInt(), m: times[2].toInt(), s: times[3].toInt(), ms: times[4].toInt() });
                current_sub.end = MooPlay.Utils.sexagesimalToTimestamp({ h: times[5].toInt(), m: times[6].toInt(), s: times[7].toInt(), ms: times[8].toInt() });
                var times = null;
            } else if(line != null && this.regexps.text.test(line)) {
                current_text.push(this.regexps.text.exec(line)[0]);
            } else if(current_sub != null) {
                subs.push(new MooPlay.Subtitle.Item(current_sub.start, current_sub.end, current_text));
                current_sub = null;
                current_text = null;
            }

        } while(line != null);

        return subs;

    },

});
/*
---
description: specific class for parsing subtitles file in SubViewer format (.sub)

license: GNU GPL

authors:
- Clément Hallet

requires:
- MooPlay
- MooPlay.Utils
- MooPlay.Subtitle.Parser.Base
- MooPlay.Subtitle.Item

provides: 
- MooPlay.Subtitle.Parser.SubViewer

...
*/


MooPlay.Subtitle.Parser.SubViewer = new Class({

    Implements: MooPlay.Subtitle.Parser.Base,
    
    regexps: {
        time: /^(\d{2}):(\d{2}):(\d{2}).(\d{3}),(\d{2}):(\d{2}):(\d{2}).(\d{3})$/,
        text: /^(.+)$/
    },
    
    options: {
        srt_end_of_line: '\n',
        onComplete: $empty
    },

    parse: function(data) {
    
        var subs = [];
        var current_sub = null;
        var current_text = null;
        var index = null

        var lines = data.split(this.options.srt_end_of_line);
        // in case file doesn't end with an empty line
        lines.push('');

        do {

            var line = lines.shift();

            if(line != null && this.regexps.time.test(line)) {
                current_text = [];
                current_sub = {};
                var times = this.regexps.time.exec(line);
                current_sub.start = MooPlay.Utils.sexagesimalToTimestamp({ h: times[1].toInt(), m: times[2].toInt(), s: times[3].toInt(), ms: times[4].toInt() });
                current_sub.end = MooPlay.Utils.sexagesimalToTimestamp({ h: times[5].toInt(), m: times[6].toInt(), s: times[7].toInt(), ms: times[8].toInt() });
                var times = null;
            } else if(line != null && this.regexps.text.test(line)) {
                current_text = this.regexps.text.exec(line)[0].split('[BR]');
            } else if(current_sub != null) {
                subs.push(new MooPlay.Subtitle.Item(current_sub.start, current_sub.end, current_text));
                current_sub = null;
                current_text = null;
            }

        } while(line != null);

        return subs;

    },

});
