var Express  = require( 'express' );
var Fs       = require( 'fs' );
var Params   = require( 'express-params' );
var Q        = require( 'q' );
var Sqlite3  = require( 'sqlite3' ).verbose( );
var Uuid     = require( './uuid' );

var DATABASE_PATH  = process.env.npm_package_config_database;
var LISTENING_PORT = process.env.npm_package_config_port;

var db = new Sqlite3.Database( DATABASE_PATH );

var server = Express( );

var run = function ( ) {
    return Q.nfapply( db.run.bind( db ), arguments ); };

var get = function ( ) {
    return Q.nfapply( db.get.bind( db ), arguments ); };

var save = function ( key, grammar, input ) {

    return Q( { $grammar : grammar, $input : input } ).then( function ( descriptor ) {

        return get( 'SELECT MAX( `id` ) AS `maxId` FROM `snippets`' ).then( function ( row ) {
            descriptor.$id = parseInt( row.maxId || 0 ) + 1;
            return descriptor;
        } );

    } ).then( function ( descriptor ) {

        return get( 'SELECT MAX( `version` ) AS `maxVersion` FROM `snippets` WHERE key = $key', {
            $key : key
        } ).then( function ( row ) {

            if ( row.maxVersion === null ) {

                descriptor.$key = Uuid.generate( descriptor.$id );
                descriptor.$version = 0;
                return descriptor;

            } else {

                descriptor.$key = key;
                descriptor.$version = parseInt( row.maxVersion ) + 1;
                return descriptor;

            }

        } );

    } ).then( function ( descriptor ) {

        return run( 'INSERT INTO `snippets` VALUES ( $id, $key, $version, $grammar, $input )', descriptor ).then( function ( ) {
            var keyPart = descriptor.$key + '/';
            var versionPart = descriptor.$version + '/';
            return '/' + ( descriptor.$version ? keyPart + versionPart : keyPart );
        } );

    } );

};

var fetch = function ( key, version ) {
    return get( 'SELECT `grammar`, `input` FROM `snippets` WHERE `key` = $key AND `version` = $version', {
        $key : key, $version : version
    } );
};

server.use( Express.bodyParser( ) );
server.use( Express.static( __dirname + '/../static/' ) );

server.get( '/', function ( req, res ) {
    return res.sendfile( 'static/index.html' ); } );
server.get( '/:key/', function ( req, res ) {
    return res.sendfile( 'static/index.html' ); } );
server.get( '/:key/:version/', function ( req, res ) {
    return res.sendfile( 'static/index.html' ); } );

server.get( '/:key/:version/data', function ( req, res ) {

    fetch( req.params.key, parseInt( req.params.version ) ).then( function ( data ) {
        if ( data ) res.json( data );
        else res.send( 404 );
    }, function ( ) {
        res.send( 500 );
    } );

} );

server.post( '/save', function ( req, res ) {

    save( req.body.key, req.body.grammar, req.body.input ).then( function ( url ) {
        res.json( { url : url } );
    }, function ( e ) {
        res.send( 500 );
    } );

} );

db.run( 'CREATE TABLE IF NOT EXISTS `snippets` (`id` INT, `key` TEXT, `version` INT, `grammar` TEXT, `input` TEXT)', function ( err ) {

    if ( err )
        throw err;

    server.listen( LISTENING_PORT );

} );
