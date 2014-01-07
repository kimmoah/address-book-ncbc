(function() {
})();
/*
(function() {
    var po = document.createElement('script');
    po.type = 'text/javascript'; po.async = true;
    po.src = 'https://apis.google.com/js/client:plusone.js?onload=render';
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(po, s);
})();

function signinCallback(authResult) {
    if (authResult['status']['signed_in']) {
        console.log(authResult['status']);
        $('#signinButton').hide();
        $('#signoutButton').show();
        $('#temp').html("You are signed in.");
    } else {
        console.log(authResult);
        $('#signinButton').show();
        $('#signoutButton').hide();
        $('#temp').html("You are not signed in.");
    }
}

function render() {
    // Additional params including the callback, the rest of the params will
    // come from the page-level configuration.
    var additionalParams = {
        'callback': signinCallback
    };

    // Attach a click listener to a button to trigger the flow.
    var signinButton = document.getElementById('signinButton');
    signinButton.addEventListener('click', function() {
        gapi.auth.signIn(additionalParams); // Will use page level configuration
    });

    // Attach a click listener to a sign-out button
    $('#signoutButton').click(function() {
        gapi.auth.signOut();
    });
}
*/
