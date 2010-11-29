(function(context){
 
context.Sets = {
 
'/Specs/master': [

    'Subtitle/Item/initialize',
    
    'Subtitle/Loader/initialize', // todo
    'Subtitle/Loader/load', // todo
    'Subtitle/Loader/run',
    'Subtitle/Loader/selectParser',
    
    'Subtitle/Parser/Base/initialize',
    'Subtitle/Parser/Base/hash',
    'Subtitle/Parser/SubRip/parse',
    'Subtitle/Parser/SubViewer/parse',
    
    'Subtitle/Player/initialize',
    'Subtitle/Player/tick',
    
    'Subtitle/Tree/initialize',
    'Subtitle/Tree/buildChildren',
    'Subtitle/Tree/getChildren',
    'Subtitle/Tree/doesSubtitleFit',
    'Subtitle/Tree/addSub',
    'Subtitle/Tree/getSubs'

],

 
};
 
})(this.exports || this);