const query = require('../raw_query')
const db = require('../../../config/database/database')
const axios = require('axios')
const moment = require('moment')
const https = require('https');
const { url } = require('inspector');
const { formatDate } = require('../../../helpers/global_helpers');
const { getTokenDwh } = require('./token');

exports.getDataSales = async (master, payload) => {
    try {
        const token = await getTokenDwh();
        
        if (!token) {
            throw new Error("Token Invalid");
        }

        const url = master?.url_akses;

        const result = await axios.post(
            url,
            {
                posting_date: payload?.posting_date,
                page: payload?.page || 1,
                limit: payload?.limit || 500
            },
            {
                maxBodyLength: Infinity,
                headers: {
                    "Accept": "*/*",
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                timeout: 120000
            }
        );
        
        return result?.data;

    } catch (error) {
        console.error(
            "ERROR GET DATA SALES:",
            error?.response?.data || error
        );

        throw error;
    }
};