#!/usr/bin/python
# -*- coding: utf-8 -*-

from collections import defaultdict
from datetime import datetime

import birthday
import operator
import util

class SameAge(birthday.BirthdayCallback):
  def start(self):
    self.names_by_age = defaultdict(list)
    self.birthday_error = defaultdict(list)

  def end(self):
    for names_with_year in self.names_by_age.items():
      print '  ', names_with_year[0]
      names_with_year[1].sort()
      for name in names_with_year[1]:
        print '    ', name

    print ('\nBirthday errors')
    for mokjang_error in self.birthday_error.items():
      print '  ', mokjang_error[0]
      for error_message in mokjang_error[1]:
        print '    ', error_message
  

  def found_birthday(self, name, mokjang, dt):
    utf8_name = name.encode('utf8')
    self.names_by_age[dt.year].append('%s (%s)' % (utf8_name, mokjang))

  def no_birthday(self, name, mokjang):
    utf8_name = name.encode('utf8')
    self.birthday_error[mokjang].append('No birthday for %s' % utf8_name)

  def invalid_birthday(self, name, mokjang, date_string):
    utf8_name = name.encode('utf8')
    self.birthday_error[mokjang].append(
            'Invalid birthday for %s : %s' % (utf8_name, date_string))

def main():
  user, pw = util.get_userid_and_password('gmail.com')
        
  sheet = birthday.NCBCTimothyAddressSpreadsheet(user, pw)
  same_age = SameAge()
  sheet.CheckSpreadsheetAddress(same_age)


if __name__ == '__main__':
  main()
