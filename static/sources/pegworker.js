importScripts( '../vendors/Peg.js' );

self.addEventListener( 'message', function ( e ) {

    var parser, value;

    try {
        parser = PEG.buildParser( e.data.grammar );
    } catch ( e ) {
        self.postMessage( [ 'Compile error : ' + e.message ] );
        return ;
    }

    try {
        value = parser.parse( e.data.input );
    } catch ( e ) {
        self.postMessage( [ 'Parse error : ' + e.message ] );
        return ;
    }

    self.postMessage( [ null, value ] );

} );
