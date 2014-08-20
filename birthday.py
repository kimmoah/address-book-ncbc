#!/usr/bin/python
# -*- coding: utf-8 -*-

try:
  from xml.etree import ElementTree
except ImportError:
  from elementtree import ElementTree
from sets import Set

from datetime import datetime
from collections import defaultdict

import operator
import gdata.apps.groups.client
import gdata.spreadsheet.service
import gdata.service
import atom.service
import gdata.spreadsheet
import atom
import getopt
import getpass
import sys
import string
import re

class Constants:
  DEFAULT_DOMAIN = 'gmail.com'

class NCBCTimothyAddressSpreadsheet:

  def __init__(self, email, password):
    self.gd_client = gdata.spreadsheet.service.SpreadsheetsService()
    self.gd_client.email = email
    self.gd_client.password = password
    self.gd_client.source = 'Spreadsheets GData Sample'
    self.gd_client.ProgrammaticLogin()
    self.list_feed = None
    self.answer_all = False

  def _CheckSpreadsheetAddress(self, spread_sheet_key):
    this_month = datetime.now().month
    next_month = this_month + 1
    if next_month is 13:
      next_month = 1
    print 'This month: %d, next month: %d' % (this_month, next_month)

    this_month_birthday = {}
    next_month_birthday = {}

    birthday_error = defaultdict(list)

    feed = self.gd_client.GetWorksheetsFeed(spread_sheet_key)
    mokjang_re = re.compile('(.*)\(([a-z]+)\)')
    for i, entry in enumerate(feed.entry):
      mokjang_result = mokjang_re.match(entry.title.text)
      if mokjang_result:
        mokjang_name = mokjang_result.group(1)
        print 'Checking birthday in ', mokjang_name

        id_parts = feed.entry[i].id.text.split('/')
        curr_wksht_id = id_parts[len(id_parts) - 1]
	list_feed = self.gd_client.GetListFeed(spread_sheet_key, curr_wksht_id)

        for i, entry in enumerate(list_feed.entry):
          name = entry.custom['name'].text.strip()
          utf8_name = name.encode('utf8')

          birthday_korean = unicode('생일', 'utf8')
          # Some spreadsheets like 'all' does not have a birthday column.
          if 'birthday' in entry.custom:
            birthday = entry.custom['birthday'].text
          elif birthday_korean in entry.custom:
            birthday = entry.custom[birthday_korean].text
          else:
            continue

          if not birthday:
            birthday_error[mokjang_name].append('No birthday for %s' % utf8_name)
            continue

          birthday = birthday.strip()

          # Parse date string to datetime.
          date_format = '%m/%d/%Y'
          try:
            d = datetime.strptime(birthday, date_format)
          except ValueError:
            birthday_error[mokjang_name].append('Invalid birthday for %s : %s' % (utf8_name, birthday))

          if d.month is this_month:
            this_month_birthday[name] = d.date().strftime(date_format)
          elif d.month is next_month:
            next_month_birthday[name] = d.date().strftime(date_format)

    sorted_this_month_birthday = sorted(this_month_birthday.iteritems(),
                                        key=operator.itemgetter(1))
    print ('\nBirthday of this month')
    for item in sorted_this_month_birthday:
      print '  %s : %s' % (item[0], item[1])

    sorted_next_month_birthday = sorted(next_month_birthday.iteritems(),
                                        key=operator.itemgetter(1))
    print ('\nBirthday of next month')
    for item in sorted_next_month_birthday:
      print '  %s : %s' % (item[0], item[1])

    print ('\nBirthday errors')
    for mokjang_error in birthday_error.items():
      print '  ', mokjang_error[0]
      for error_message in mokjang_error[1]:
        print '    ', error_message
  
  def Run(self):
    # Check 'single Timothy 2012'
    self._CheckSpreadsheetAddress('tIqN7d9096WggJYhJFAofXA')

def main():
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
    message = 'Userid (i.e., YOURID@' + Constants.DEFAULT_DOMAIN + ' or just YOURID): '
    user = raw_input(message)
    if user.find('@') == -1:
      user += '@' + Constants.DEFAULT_DOMAIN
      print 'Set Userid to ', user
  if pw == '':
    pw = getpass.getpass()

  if user == '' or pw == '':
    print 'python spreadsheetExample.py --user [username] --pw [password] '
    sys.exit(2)
        
  sample = NCBCTimothyAddressSpreadsheet(user, pw)
  sample.Run()


if __name__ == '__main__':
  main()
