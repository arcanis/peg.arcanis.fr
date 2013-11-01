var defaultGrammar = "/*\n * Classic example grammar, which recognizes simple arithmetic expressions like\n * \"2*(3+4)\". The parser generated from this grammar then computes their value.\n */\n\nstart\n  = additive\n\nadditive\n  = left:multiplicative \"+\" right:additive { return left + right; }\n  / multiplicative\n\nmultiplicative\n  = left:primary \"*\" right:multiplicative { return left * right; }\n  / primary\n\nprimary\n  = integer\n  / \"(\" additive:additive \")\" { return additive; }\n\ninteger \"integer\"\n  = digits:[0-9]+ { return parseInt(digits.join(\"\"), 10); }\n";
var defaultInput = "2*(3+4)";

angular.module( 'app', [ 'ngRoute', 'ui.codemirror' ] )

    .config( function ( $locationProvider, $routeProvider ) {

        $locationProvider.html5Mode( true );

        $routeProvider.when( '/', { } );
        $routeProvider.when( '/:key/', { } );
        $routeProvider.when( '/:key/:version/', { } );

    } )

    .factory( 'cancelator', function ( $timeout ) {

        return {
            setTimeout : function ( deferrable, time ) {

                $timeout( function ( ) {
                    deferrable.reject( 'The process timeout\'d - check for a loop in your grammar !' );
                }, time );

            }
        };

    } )

    .factory( 'pegjs', function ( $q, cancelator ) {

        var previousDefer = null;

        return {

            process : function ( grammar, input ) {

                if ( previousDefer !== null )
                    previousDefer.reject( );

                var currentDefer = previousDefer = $q.defer( ), promise = currentDefer.promise;
                cancelator.setTimeout( currentDefer, 500 );

                var worker = new Worker( 'sources/pegworker.js' );

                worker.addEventListener( 'message', function ( e ) {

                    if ( ! currentDefer )
                        return ;

                    if ( e.data[ 0 ] ) {
                        currentDefer.reject( e.data[ 0 ] );
                    } else {
                        currentDefer.resolve( e.data[ 1 ] );
                    }

                } );

                worker.postMessage( {
                    grammar : grammar,
                    input : input
                } );

                promise.finally( function ( ) {
                    worker.terminate( );
                    currentDefer = null;
                    previousDefer = null;
                } );

                return currentDefer.promise;

            }

        };

    } )

    .factory( 'server', function ( $q, $http, $location ) {

        var saveRequestId = 0;
        var loadRequestId = 0;

        return {

            save : function ( key, grammar, input ) {

                var requestId = ++ saveRequestId;

                return $http.post( '/save', {
                    key : key, grammar : grammar, input : input
                } ).then( function ( response ) {

                    if ( requestId !== saveRequestId )
                        return ;

                    $location.path( response.data.url );

                } );

            },

            load : function ( key, version ) {

                if ( key === null ) {

                    var defer = $q.defer( );
                    defer.resolve( { current : { grammar : defaultGrammar, input : defaultInput } } );
                    return defer.promise;

                } else {

                    var requestId = ++ loadRequestId;

                    return $http.get( '/' + key + '/' + version + '/data' ).then( function ( response ) {

                        if ( requestId !== loadRequestId )
                            return null;

                        return response.data;

                    } );

                }

            }

        };

    } )

    .controller( 'main', function ( $scope, $location, $route, $routeParams, pegjs, server ) {

        $scope.key     = null;
        $scope.version = 0;

        $scope.editors = {
            grammar : { mode : 'pegjs', lineNumbers : true, extraKeys : { "Ctrl-S" : function ( ) { $scope.save( ); } } },
            input : { mode : 'text', lineNumbers : true, extraKeys : { "Ctrl-S" : function ( ) { $scope.save( ); } } },
            output : { readOnly : 'nocursor', onLoad : function ( editor ) {
                $scope.$watch( 'outputMode', function ( ) {
                    editor.setOption( $scope.outputMode );
                } );
            } } };

        $scope.grammar = defaultGrammar;
        $scope.input   = defaultInput;
        $scope.output  = null;

        $scope.save = function ( ) {

            server.save( $scope.key, $scope.grammar, $scope.input );

        };

        $scope.reset = function ( ) {

            $location.path( '/' );

        };

        $scope.export = function ( ) {

            try {

                var parser = PEG.buildParser( $scope.grammar );
                var source = parser.toSource( );

                var symbol = prompt( 'In which symbol do you wish to export the parser ?', 'module.exports' );
                if ( ! symbol ) return ;

                var url = 'data:application/octet-stream;charset=utf-8;,' + symbol + '=' + source + ';\n';

                var link = document.createElement( 'a' );
                link.setAttribute( 'href', url );
                link.setAttribute( 'download', 'parser.js' );

                var event = document.createEvent( 'MouseEvents' );
                event.initEvent( 'click', true, true );
                link.dispatchEvent( event );

            } catch ( e ) {

            }

        };

        $scope.$on( '$routeChangeSuccess', function ( ) {

            $scope.key = $routeParams.key || null;
            $scope.version = $routeParams.version || 0;

        } );

        $scope.$watchCollection( '[ key, version ]', function ( ) {

            server.load( $scope.key, $scope.version ).then( function ( data ) {

                if ( ! data )
                    return ;

                $scope.grammar = data.current.grammar;
                $scope.input = data.current.input;

            } );

        } );

        $scope.$watchCollection( '[ grammar, input ]', function ( ) {

            pegjs.process( $scope.grammar, $scope.input ).then( function ( data ) {

                $scope.error = null;

                if ( typeof data === 'string' ) {
                    $scope.outputMode = 'text';
                    $scope.output = data;
                } else {
                    $scope.outputMode = 'javascript';
                    $scope.output = JSON.stringify( data, null, '    ' );
                }

            }, function ( error ) {

                if ( ! error )
                    return ;

                $scope.error = error;

            } );

        } );

    } )

;
