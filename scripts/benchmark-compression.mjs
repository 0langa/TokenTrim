import { compress } from '../src/compression/pipeline.js';

const sample = `# Project Overview

This is a comprehensive guide to the TokenTrim application. It is important to mention that this documentation should be read carefully before proceeding. In order to understand the full scope of the project, please refer to the implementation details below.

## Requirements

The implementation of the system must satisfy the following non-functional requirements:

1. The application should be able to process large text files with over one hundred thousand characters.
2. The system must not lose any technical accuracy during compression.
3. It is necessary that all configurations are properly validated.

## Architecture

The architecture of the application is based on a browser-first design. The user interface communicates with the compression pipeline through web workers. Due to the fact that the compression happens locally, there is no need for external API calls.

The configuration file (configuration file) defines the rules for the transformation engine. The database stores user preferences. The request handler processes incoming data and sends a response back to the client.

## Performance Considerations

In general, the performance of the system is quite good. However, there are some areas that could be improved. For example, the deduplication transform could be optimized to handle larger inputs more efficiently. Additionally, the section salience scoring mechanism needs to be refined.

The system has the ability to process multiple files simultaneously. It is able to handle up to five million requests per day. The average response time is approximately two hundred milliseconds.

## Contact

For more information, please do not hesitate to contact the development team. We are looking forward to hearing from you. Thank you for your interest in this project.
`;

for (const mode of ['light', 'normal', 'heavy', 'ultra']) {
  const res = compress(sample, { mode, profile: 'general' });
  const pct = ((res.metrics.charSavings / res.metrics.originalChars) * 100).toFixed(1);
  console.log('\n=== ' + mode.toUpperCase() + ' ===');
  console.log('Savings: ' + pct + '% (' + res.metrics.originalChars + ' -> ' + res.metrics.outputChars + ' chars)');
  console.log('Applied transforms:');
  for (const s of res.report.transformStats) {
    if (s.replacements > 0) {
      console.log('  ' + s.transformId + ': ' + s.replacements + ' replacements, ' + s.charsSaved + ' chars saved');
    }
  }
  if (res.rejectedTransforms.length) {
    console.log('Rejected transforms: ' + res.rejectedTransforms.join(', '));
  }
}
