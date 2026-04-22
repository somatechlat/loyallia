const axios = require('axios');
(async () => {
    let res = await axios.post('http://localhost:8000/api/v1/auth/login/', {email: "test_owner@loyallia.com", password: "123456"});
    let token = res.data.access_token;
    let list = await axios.get('http://localhost:8000/api/v1/customers/', {headers: {Authorization: `Bearer ${token}`}});
    let id = list.data.customers[0].id;
    try {
        let cust = await axios.get(`http://localhost:8000/api/v1/customers/${id}/`, {headers: {Authorization: `Bearer ${token}`}});
        console.log("Customer Fetch Success!");
    } catch(e) {
        console.error("Customer Fetch Failed:", e.response.status, e.response.data);
    }
})();
