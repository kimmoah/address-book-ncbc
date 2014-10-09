import getopt
import getpass
import sys

def get_userid_and_password(default_domain):
  # parse command line options
  try:
    opts, args = getopt.getopt(sys.argv[1:], "", ["user=", "pw="])
  except getopt.error, msg:
    print 'python spreadsheetExample.py --user [username] --pw [password] '
    sys.exit(2)
  
  # Process options
  user = ''
  pw = ''
  # Use userid and password from the command line if exists.
  for o, a in opts:
    if o == "--user":
      user = a
    elif o == "--pw":
      pw = a

  # Read userid and password if they're not set.
  if user == '':
    message = 'Userid (i.e., YOURID@' + default_domain + ' or just YOURID): '
    user = raw_input(message)
    if user.find('@') == -1:
      user += '@' + default_domain
      print 'Set Userid to ', user
  if pw == '':
    pw = getpass.getpass()

  if user == '' or pw == '':
    print 'python spreadsheetExample.py --user [username] --pw [password] '
    sys.exit(2)

  return (user, pw)
