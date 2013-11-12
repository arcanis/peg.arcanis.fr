importScripts( '../vendors/Peg.js' );

var compile = function ( source, callback ) {

    var parser, value;

    try {
        parser = PEG.buildParser( source.grammar );
    } catch ( e ) {
        callback( e.name !== 'PEG.GrammarError' ? {
            type : 'compile',
            line : e.line,
            column : e.column,
            expected : e.expected,
            found : e.found
        } : {
            type : 'compile',
            message : e.message
        }, null );
        return ;
    }

    try {
        value = parser.parse( source.input );
    } catch ( e ) {
        callback( {
            type : 'parse',
            line : e.line,
            column : e.column,
            expected : e.expected,
            found : e.found
        }, null );
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
