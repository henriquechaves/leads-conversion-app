# Lead Conversion

Applicant should receive the file `dist/tenfold-lead-conversion-test.zip` which contains sample datasets for the test and a README.md with content below.

## Context

The client have a CRM with leads and opportunities data and would like to know the better target for their product by getting the following rates:
- Conversion rate
- Conversion rate by industry
- Conversion rate by referrer
- Conversion rate by origin referrer

The records that should be in the metric have it's id storaged in the file `segments.json`

in the first segment, each segment has an array with records id in the field `_records`.

The record data is storaged on a file named `./records/record.{_id}.json`,

 Each record has a record **referrer** id in the field `createdBy` field; and an map of **custom fields** `customFields` (Tip: if the property `isConverted` has the value true it means record is **converted**).

The **origin referrer** is the top level referrer, example:
```
Record A is createdBy B
Record B is createdBy C
Record C is createdBy null

The origin referrer is C
```

Your function should return a promise, read files on series using **asynchronous** functions.

```js
/**
 * @param {string} segmentFileName
 * @return {Promise}
 */
module.exports.getConversionReport = function (segmentFileName) {
}
```

The promise should be resolved with data in the following model:

```
{
    "conversionRate": {
        "All": {
            "total": 87, "converted": 11, "notConverted": 76, "rate": 0.12643678160919541
        }
    },
    "conversionRateByIndustry": {
        "null": {
            "total": 81, "converted": 9, "notConverted": 72, "rate": 0.1111111111111111
        },
        "Entertainment": {
            "total": 1, "converted": 0, "notConverted": 1, "rate": 0
        },
        [...]
    },
    "conversionRateByReferrer": {
        "null": {
            "total": 87, "converted": 11, "notConverted": 76, "rate": 0.12643678160919541
        },
        "571ff6b3c373568e01d2837d": {
            "total": 2, "converted": 1, "notConverted": 1, "rate": 0.12643678160919541
        },
        [...]
    },
    "conversionRateByOriginReferrer": {
        "null": {
            "total": 80, "converted": 11, "notConverted": 76, "rate": 0.12643678160919541
        },
        "571ff6b3c373568e01d2837d": {
            "total": 2, "converted": 1, "notConverted": 1, "rate": 0.12643678160919541
        },
        [...]
    }
}
```
================================================================================
================================================================================
================================================================================

considerações sobre o teste:

1 - Nome do arquivo de entrada, segmentFileName é um json de M elementos.

2 - Pasta records contém N arquivos json nomeados assim: 'record.{id}.json',
    onde variável id é unica para cada desses jsons (records)

3 - A relação entre segmentos e seus records está definida na
    propriedade '_records' do segmento: um array contendo ids de records.

4 - Um record pode ou não estar convertido, informação que se encontra na propriedade
    tipo <boolean> deste record: 'customFields.IsConverted.value'.

5 - Há hierarquia de pai e filho entre records:
    -> O pai de um record tem seu id informado na propriedade 'createdBy' do de seu filho.
    -> Se essa propriedade é null, o record está no topo da hierarquia e
    é classificado como 'origin referrer', podendo ou não ter um record filho.
    -> Caso contrário, é um record filho, e este filho pode ou não ter
    também seus records filhos. De todo modo, como não está no topo da hierarquia,
    é classificado apenas de 'referrer'.
6 - industry:
