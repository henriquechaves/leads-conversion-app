'use strict'

const ConversionReport = require('./ConversionReport.js')

const segmentFileName = './segments.json'

ConversionReport.getConversionReport(segmentFileName)
.then(report => {
  console.log("ConversionReport results: ", report);
})
