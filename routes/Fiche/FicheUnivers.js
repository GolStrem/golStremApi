const express = require('express');
const router = express.Router({ mergeParams: true });

const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();
const { auth } = require('@lib/RouterMisc');
const { filtAsync, check } = require('@lib/Util');
const { cleanPos  } = require('@lib/MoveFiche');

router.delete('', auth('fiche', 2), async(req, res) => {
    const { id } = req.params;
    const fiche = await db.oneResult("select idUnivers from fiche where deletedAt is null and id = ? and idOwner = ?", id, session.getUserId())
    if (!fiche) return res.status(404).send("no fiche");

    await db.query("update fiche set idUnivers = null, idModele = null where id = ?", id)
    await db.query("delete from subscribeFiche where idFiche = ?", id)
    await db.query("delete from fichePos where idFiche = ? and type = 'univers' and targetId = ?", id, fiche.idUnivers)
    await cleanPos('univers', fiche.idUnivers)
    return res.send("success");
})

router.post('', auth('fiche', 2), async(req, res) => {
    const { id } = req.params;
    const { idUnivers, idModele } = req.body;
    const fiche = await db.oneResult("select 1 from fiche where deletedAt is null and idUnivers is null and id = ? and idOwner = ?", id, session.getUserId())
    if (!fiche) return res.status(404).send("no fiche");

    const modelExist = await db.oneResult("select 1 from modelFiche where id = ? and idUnivers = ?", idModele, idUnivers)
    if (!modelExist) return res.status(404).send("no model");

    const error = {};

    let listRule = await db.query("select target,rule,value from modelFicheRule where idModele = ?", idModele)
    let fctWithEnv = async (rule) => {return await checkRule(rule, idUnivers, id, error)}

    
    listRule = await filtAsync(listRule, fctWithEnv)
    
    if (error && Object.keys(error).length > 0){
        return res.json({status: 'error', error: error})
    }

    await db.push('subscribeFiche', 'idFiche, idUnivers, idModele, state', [id, idUnivers, idModele, 0])

    return res.json({status: 'success'})
    
    
})

async function checkRule(rule, idUnivers, idFiche, error) {

    if (rule.rule === 'role') {
        if (!(await db.exist(qry.role, idUnivers, session.getUserId(), rule.value))) {
            error.role = rule.value
            return true
        }
        return false;
    }
    
    if (rule.rule === 'moduleMandatory') {
        let listModule = (await db.query(qry.moduleMandatory, idFiche)).map(module => module.name)
        const listModuleLose = rule.value.split(',').filter(module => !listModule.includes(module))
        if(listModuleLose.length > 0) {
            error.moduleMandatory = listModuleLose.join(', ')
            return true
        }
        return false
    }

    if (rule.rule === 'size') {
        const limit = JSON.parse(rule.value)
        const target = rule.target.split('.')
        const module = await db.oneResult(qry.module, idFiche, target[0])
        
        if(!module) {
            if(!error.size) error.size = []
            error.size.push({target: rule.target, value: 'empty'})
            return true
        }
        const extra = JSON.parse(module.extra)
        if(target.length > 1 && !extra[target[1]]) {
            if(!error.size) error.size = []
            error.size.push({target: rule.target, value: 'empty'})
            return true
        }
        let targetData = target.length > 1 ? [extra[target[1]]] : Object.values(extra)
        targetData = await Promise.all(targetData.map(moduleKey))
        const length = totalChars(targetData)
        if (limit['>'] && length < limit['>']){
            if(!error.size) error.size = []
            error.size.push({target: rule.target, value: `> ${limit['>'] - length}`})
            return true
        }

        if (limit['<'] && length > limit['<']){
            if(!error.size) error.size = []
            error.size.push({target: rule.target, value: `< ${length - limit['<']}`})
            return true
        }
        return false
    }

    

    
    return true;
}

const moduleKey = async (label) => {
    const regex = /^\$\$([^ ]+)\$\$$/;
    const oldExtraId = check(label, regex)
    if (oldExtraId === false) {
        return label
    }else{
        return (await db.oneResult('select text from moduleKey where id = ?', oldExtraId)).text
    }
}

const totalChars = (data) => data.reduce((acc, html) => {
    const text = html.replace(/<[^>]*>/g, '')
    return acc + text.length
  }, 0)

const qry = {
    role: 'select 1 from userUnivers where idUnivers = ? and idUser = ? and state >= ?',
    moduleMandatory: 'select name from module where type = 1 and targetId = ?',
    module: 'select extra from module where type = 1 and targetId = ? and name = ?',
}


module.exports = router;