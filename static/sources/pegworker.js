importScripts( '../vendors/Peg.js' );

var compile = function ( source, callback ) {

    var parser, value;

    try {
        parser = PEG.buildParser( source.grammar );
    } catch ( e ) {
        callback( { type : 'compile' }, null );
        return ;
    }

    try {
        value = parser.parse( source.input );
    } catch ( e ) {
        callback( { type : 'parse' }, null );
        return ;
    }

    callback( null, value );

};

self.addEventListener( 'message', function ( e ) {
    compile( e.data.source, function ( error, result ) {
        self.postMessage( {
            tid : e.data.tid,
            error : error,
            result : result
        } );
    } );
} );
