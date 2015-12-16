from __future__ import print_function
import httplib2
import os

from apiclient import discovery
import oauth2client
from oauth2client import client
from oauth2client import tools
import gdata.service
import gdata.spreadsheet
import gdata.spreadsheet.service

import sys
import getpass
import urllib
import gdata.gauth

try:
    import argparse
    flags = argparse.ArgumentParser(parents=[tools.argparser]).parse_args()
except ImportError:
    flags = None

SCOPES = 'https://www.googleapis.com/auth/admin.directory.group'
CLIENT_SECRET_FILE = 'client_secret.json'
APPLICATION_NAME = 'Directory API Python Quickstart'


def get_credentials():
    """Gets valid user credentials from storage.

    If nothing has been stored, or if the stored credentials are invalid,
    the OAuth2 flow is completed to obtain the new credentials.

    Returns:
        Credentials, the obtained credential.
    """
    home_dir = os.path.expanduser('~')
    credential_dir = os.path.join(home_dir, '.credentials')
    print(credential_dir)
    if not os.path.exists(credential_dir):
        os.makedirs(credential_dir)
    credential_path = os.path.join(credential_dir,
                                   'admin-directory_v1-python-quickstart.json')

    store = oauth2client.file.Storage(credential_path)
    credentials = store.get()
    if not credentials or credentials.invalid:
        flow = client.flow_from_clientsecrets(CLIENT_SECRET_FILE, SCOPES)
        flow.user_agent = APPLICATION_NAME
        if flags:
            credentials = tools.run_flow(flow, store, flags)
        else: # Needed only for compatibility with Python 2.6
            credentials = tools.run(flow, store)
        print('Storing credentials to ' + credential_path)
    return credentials

def main():
    client_id = '666028720508-vlkpvb2lg2opmehujrlv3i805cebudve.apps.googleusercontent.com'

    client_secret = 'jx11aJQwLXKkkH3ZQ62iYhNy'

    # Create a request token.
    request_token = gdata.gauth.OAuth2Token(
         client_id = client_id, client_secret = client_secret,
        scope = 'https://spreadsheets.google.com/feeds',
        user_agent = 'GdataPythonClientExample')

    # Authorize the request token in the browser.
    print (str(request_token.generate_authorize_url()))

    code = raw_input('What is the verification code? ').strip()
    request_token.get_access_token(code)
    client = gdata.spreadsheet.service.SpreadsheetsService()
    # client.auth_token = request_token
    feed = client.GetWorksheetsFeed('tIqN7d9096WggJYhJFAofXA')
    mokjang_re = re.compile('(.*)\(([A-Za-z0-9]+)\)')
    for i, entry in enumerate(feed.entry):
      mokjang_result = mokjang_re.match(entry.title.text)
      print(mokjang_result);


    """Shows basic usage of the Google Admin SDK Directory API.

    Creates a Google Admin SDK API service object and outputs a list of first
    10 users in the domain.
    credentials = get_credentials()
    print ('Start: credentials.authorize(httplib2.Http())');
    http = credentials.authorize(httplib2.Http())
    print ('End: credentials.authorize(httplib2.Http())');
    service = discovery.build('admin', 'directory_v1', http=http)
    print ('Build directory service');

    print('Getting the list of Groups');
    results = service.groups().list(domain='ncbctimothy.org').execute();
    users = results.get('groups', [])

    if not users:
        print('No users in the domain.')
    else:
        print('Group:')
        for user in users:
            print(user['name'], user['email']);
    """


if __name__ == '__main__':
    main()
