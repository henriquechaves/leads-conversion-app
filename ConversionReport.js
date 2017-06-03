'use strict'

const async = require('async')
const fse = require('fs-extra')

let segments = []

// Retorna um objeto template util no relacionamento de dados extraidos
const getPartialReporterTemplate = () => {
  let report = {
    id: '',
    total: 0,
    converted: 0,
    referrer: 0,
    referrerOrigin: 0,
    industry: {}
  }
  return report
}

// Retorna um objeto template util na geração do relatório final
const getRateTemplate = () => {
  let rates = {
    total: 0,
    converted: 0,
    notConverted: 0,
    rate: 0
  }
  return rates
}

// Também retorna um objeto template util na geração do relatório final
const getReporterTemplate = () => {
  let reporter = {
    conversionRate: {
      All: {}
    },
    conversionRateByIndustry: {},
    conversionRateByReferrer: {},
    conversionRateByOriginReferrer: {}
  }
  return reporter
}

// Faz a leitura e retorna a lista de segmentos no arquivo json de entrada.
const readSegmentFile = (segmentFileName) => {
  return fse.readJson(segmentFileName)
  .then(data => data)
  .catch(err => { console.log(err) })
}

// Retorna apenas as informações que interessam do json de segmentos
const getSegmentBrief = (results) => {
  const res = results.map(item => {

    let tpl = getPartialReporterTemplate()

    tpl._id = item._id
    tpl.name = item.name
    tpl._records = item._records
    tpl.industry = item.filterOptions.Industry.values

    return tpl

  })

  return res
}

// @param { object } segment: um segment individual i
// @param { object } recordData: um record individual j
// @return { object } unitReport
// Transforma os dados de entrada num relatorio parcial entre os dois.
// Refiro-me a esse relatorio parcial como "relatorio unitário" (RU)
const transformData = (segment, record) => {

  let unitReport = getPartialReporterTemplate()

  unitReport.id = segment._id
  unitReport.industry = segment.industry.reduce((acc, cur, index) => {
                          acc[cur] = 0
                          return acc
                        }, {})

  // o record esta contido no segmento?
  // incrementa 'total' ao RU
  if (segment._records.find(i => i === record._id)) {
    unitReport.total++
    // o record está isConverted true? incrementa 'converted' no RU
    if (record.customFields.IsConverted.value) unitReport.converted++
    // o record está no topo da hieraruia ( createdBy = null ) ?
    // incrementa 'origin referrer' no RU
    if (!record.createdBy) unitReport.referrerOrigin++
    // do contrario deve incrementar 'referrer'
    else unitReport.referrer++

    // foi configurado com o campo 'Industry' e seu valor existe no segmento?
    if (
      ('Industry' in record.customFields) &&
      ('value' in record.customFields.Industry) &&
      (record.customFields.Industry.value in unitReport.industry)
    )
      // incrementa o respectivo setor industry no RU
      unitReport.industry[record.customFields.Industry.value]++
    else
    // se não, incrementa null
      unitReport.industry[null]++
  }

  return unitReport
}

// Função de conversão para mapSeries.
// @param { string } recordFileName: nome do arquivo json do record
// @param { function } cb: callback individual da função assincrona mapSeries
// @return: { array } unitReportArray
// Retorna um array de relatorios individuais segment/record.
// Ou seja, para o record individual fornecido na série, retorna os relatorios
// deste record depois de mapeado a cada um dos segmentos.
// Portanto, o tamanho deste array de retorno é igual ao numero de segmentos.
const conversion = (recordFileName, cb) => {
  fse.readJson(`./records/${recordFileName}`, (err, recordData) => {
    let unitReportArray = segments.map(seg => transformData(seg, recordData))
    return cb(null, unitReportArray)
  })
}

// Retorna a soma de dois objetos
const sumRate = (current, previous) => {

  let rate = getRateTemplate()

  rate.total = current.total + previous.total
  rate.converted = current.converted + previous.converted
  rate.referrer = current.referrer + previous.referrer
  rate.referrerOrigin = current.referrerOrigin + previous.referrerOrigin

  return rate
}

// Retorna a soma do array de objetos
const sumRateArray = (previousArray, currentArray) => {

  let previousArrayResults
  if(previousArray.length) {
    previousArrayResults = previousArray.reduce((previous, current) => {
      return sumRate(previous, current)
    })
  } else {
    previousArrayResults = previousArray
  }

  const currentArrayResults = currentArray.reduce((previous, current) => {
    return sumRate(previous, current)
  })

  return sumRate(currentArrayResults, previousArrayResults)
}

const getConversionRate = (data) => {

  // Retorna a soma do array de array de objetos
  const conversion = data.reduce((previousArray, currentArray) => {
    return sumRateArray(previousArray, currentArray)
  })

  conversion.notConverted = conversion.total - conversion.converted
  conversion.rate = conversion.converted / conversion.total

  return conversion
}

// A partir dos dados de entrada, uma matriz de objetos MxN,
// cria o relatório final de acordo com os requisitos de saída e retorna.
// 'data' é uma matriz M x N de objetos.
  // M = total de segmentos
  // N = total de records
  // Esses objetos são os RU's (relatorios unitarios) gerados pela função transformData.
  // A função de conversão gera um array tamanho M desses objetos para um dado record
  // O mapSeries organiza esses arrays num array tamanho N.
const reporter = (data) => {

  // RESOLVE A PROP 'conversionRate'
  // FALTA O RESTANTE DAS PROPS REQUERIDAS NO RELATORIO

  let reporter = getReporterTemplate()
  reporter.conversionRate.All = getConversionRate(data)


  return reporter
}

module.exports.getConversionReport = (segmentFileName) => {
  return readSegmentFile(segmentFileName)
  .then(res => {
    segments = getSegmentBrief(res)
    return fse.readdir('./records').then(files => {
      return new Promise((resolve, reject) => {
        // Aplica a função de conversão uma vez em cada record da lista,
        // de modo assincrono e em série.
        // Cada iteração append no resultado um array de relatorios do record
        // com cada um dos segmentos.
        // Portanto, o retorno dessa função é um array com todos os arrays criados acima.
        // Assim, o tamanho desse array de retorno é igual ao número de iterações, ou
        // o número de records e tem dimensão M segmentos x N records.
        async.mapSeries(
          files,
          conversion,
          (err, data) => { if(err) reject(err); else return resolve(reporter(data)) }
        )
      })
    })
  })
}
