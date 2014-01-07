(function() {
    var express        = require('express'),
        request        = require('request'),
        passport       = require('passport'),
        util           = require('util'),
        OAuth2Strategy = require('passport-oauth').OAuth2Strategy;

    var accessToken;


    // Passport session setup.
    //   To support persistent login sessions, Passport needs to be able to
    //   serialize users into and deserialize users out of the session.  Typically,
    //   this will be as simple as storing the user ID when serializing, and finding
    //   the user by ID when deserializing.  However, since this example does not
    //   have a database of user records, the complete Google profile is serialized
    //   and deserialized.
    passport.serializeUser(function(user, done) {
      done(null, user);
    });

    passport.deserializeUser(function(obj, done) {
      done(null, obj);
    });


    // Use the GoogleStrategy within Passport.
    //   Strategies in passport require a `validate` function, which accept
    //   credentials (in this case, an OpenID identifier and profile), and invoke a
    //   callback with a user object.
    passport.use('GoogleAuth', new OAuth2Strategy({
        authorizationURL: 'https://accounts.google.com/o/oauth2/auth?' +
                          'scope=email%20profile%20https://www.googleapis.com/auth/drive&' +
                          'state=%2Fprofile&' +
                          'response_type=code&',
        tokenURL        : 'https://accounts.google.com/o/oauth2/token',
        clientID        : '968458110404.apps.googleusercontent.com',
        clientSecret    : '_G4D1o45y2WPeI21irMQPkNL',
        callbackURL     : 'http://hyo.cloudapp.net/auth/google/return'
    }, function(aToken, refreshToken, profile, done) {
        // asynchronous verification, for effect...
        process.nextTick(function () {
            // To keep the example simple, the user's Google profile is returned to
            // represent the logged-in user.  In a typical application, you would want
            // to associate the Google account with a user record in your database,
            // and return that user instead.
            accessToken = aToken;

            var options = {
                url: 'https://www.googleapis.com/drive/v2/files/0AunZSBuWxmdfdElxTjdkOTA5NldnZ0pZaEpGQW9mWEE',
                headers: {
                    'Authorization': 'Bearer ' + accessToken
                }
            };

            app.get('/get_files', ensureAuthenticated,
                function(req, response) {
                    request.get(options, function(err, res, body) {
                        response.json(body);
                    });
                }
            );

            return done(null, profile);
        });
    }));

    var drive_api = 'https://www.googleapis.com/drive/v2';
    var app = express();

    // configure Express
    app.configure(function() {
        app.set('views', __dirname);
        app.use(express.logger());
        app.use(express.cookieParser());
        app.use(express.bodyParser());
        app.use(express.methodOverride());
        app.use(express.session({ secret: 'keyboard cat' }));
        // Initialize Passport!  Also use passport.session() middleware, to support
        // persistent login sessions (recommended).
        app.use(passport.initialize());
        app.use(passport.session());
        app.use(app.router);
        app.use(express.static(__dirname + '/../'));
    });

    app.get('/index.html', ensureAuthenticated);

    // GET /auth/google
    //   Use passport.authenticate() as route middleware to authenticate the
    //   request.  The first step in Google authentication will involve redirecting
    //   the user to google.com.  After authenticating, Google will redirect the
    //   user back to this application at /auth/google/return
    app.get('/', 
        passport.authenticate('GoogleAuth', { failureRedirect: '/' }),
        function(req, res) {
            res.redirect('/');
        }
    );

    // GET /auth/google/return
    //   Use passport.authenticate() as route middleware to authenticate the
    //   request.  If authentication fails, the user will be redirected back to the
    //   login page.  Otherwise, the primary route function function will be called,
    //   which, in this example, will redirect the user to the home page.
    app.get('/auth/google/return', 
        passport.authenticate('GoogleAuth', { failureRedirect: '/' }),
        function(req, res) {
            res.redirect('/index.html');
        }
    );

    app.listen(80);

    // Simple route middleware to ensure user is authenticated.
    //   Use this route middleware on any resource that needs to be protected.  If
    //   the request is authenticated (typically via a persistent login session),
    //   the request will proceed.  Otherwise, the user will be redirected to the
    //   login page.
    function ensureAuthenticated(req, res, next) {
      if (req.isAuthenticated()) { return next(); }
      res.redirect('/')
    }
})();
