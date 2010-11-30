document.addEvent('domready', function() {
    
    var reader = new MooPlay.Subtitle.Player($('video'), $('subtitle'), {
        onDisplay: function(element, container, overlapping) {
            element.addClass('overlapping' + String(overlapping));
            element.setStyles({
                'left': container.offsetWidth
            });
            element.inject(container, 'bottom');
            var effect = new Fx.Morph(element, {
                fps: 30,
                link: 'cancel',
                duration: 150
            });
            effect.start({
                'left': 0
            });

        },
        onDispose: function(element, container, overlapping) {
            element.setStyles({
                'margin-left': 0
            });
            var effect = new Fx.Morph(element, {
                fps: 30,
                link: 'cancel',
                duration: 80,
                onComplete: function() {
                    element.dispose();
                    element.removeClass('overlapping' + String(overlapping));
                }
            });
            effect.start({
                'left': -container.offsetWidth
            });
        }
    });
    
    var mySelect = new MavSelectBox({
        elem: $('subtitles_select'),
        selectboxClass: 'subtitles_select',
        selectmenuClass: 'options',
        optionClass: '',
        fxProperty: 'height',
        fxFrom: 0,
        fxTo: 115,
        showStyles: true
    });

    mySelect.addEvent('select', function() {
        var value = $('subtitles_select').value;
        if(value != '') {
            var loader = new MooPlay.Subtitle.Loader( value, {
                onComplete: function(subs_hash) {
                    reader.loadSubtitles(subs_hash);
                }
            });
        } else {
            reader.unLoad();
        }
        
    });

});