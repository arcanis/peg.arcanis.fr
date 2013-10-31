var Base62   = require( 'base62' );

var roundFunction = function ( input ) {

    var uint = new Uint32Array( 1 );

    uint[ 0 ] = input * 1369;
    uint[ 0 ] += 150889;
    uint[ 0 ] %= 714025;

    return uint[ 0 ] / 714025;

};

var permuteId = function ( id ) {

    var uint = new Uint32Array( 5 );

    uint[ 4 ] = id;
    uint[ 0 ] = ( uint[ 4 ] >> 16 ) & 65535;
    uint[ 1 ] = uint[ 4 ] & 65535;
    uint[ 2 ] = 0;
    uint[ 3 ] = 0;

    for ( var i = 0; i < 3; ++ i ) {
        uint[ 4 ] = roundFunction( uint[ 1 ] ) * 65535;
        uint[ 2 ] = uint[ 1 ];
        uint[ 3 ] = uint[ 0 ] ^ uint[ 4 ];
        uint[ 0 ] = uint[ 2 ];
        uint[ 1 ] = uint[ 3 ];
    }

    uint[ 4 ] = ( ( uint[ 1 ] << 16 ) + uint[ 0 ] );
    return uint[ 4 ];

};

exports.generate = function ( id ) {

    return Base62.encode( permuteId( id ) );

};
