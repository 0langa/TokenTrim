const text = "The system mustn't lose any technical accuracy. don't hesitate to contact us.";
console.log('Regex test on mustn\'t:');
console.log('  /\\bmust\\b/gi:', text.match(/\bmust\b/gi));
console.log('  /\\bmust\\b/gi on "mustn\'t":', "mustn't".match(/\bmust\b/gi));
console.log('  char after t:', JSON.stringify("mustn't"[4]));
console.log('  is word char:', /\w/.test("mustn't"[4]));
console.log('  is boundary:', /\bmust\b/.test("mustn't"));
