const http = require('http');

const data = JSON.stringify({ email: "test_owner@loyallia.com", password: "123456" });

const req = http.request(
    { hostname: 'localhost', port: 8000, path: '/api/v1/auth/login/', method: 'POST', headers: {'Content-Type': 'application/json', 'Content-Length': data.length} },
    res => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
            const token = JSON.parse(body).access_token;
            
            const createReq = http.request(
                { hostname: 'localhost', port: 8000, path: '/api/v1/notifications/campaigns/', method: 'POST', headers: {'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json'} },
                cRes => {
                    let cBody = '';
                    cRes.on('data', d => cBody += d);
                    cRes.on('end', () => {
                        console.log("CREATE:", cRes.statusCode, cBody);
                        
                        const listReq = http.request(
                            { hostname: 'localhost', port: 8000, path: '/api/v1/notifications/campaigns/', method: 'GET', headers: {'Authorization': `Bearer ${token}`} },
                            lRes => {
                                let lBody = '';
                                lRes.on('data', d => lBody += d);
                                lRes.on('end', () => console.log("LIST:", lRes.statusCode, lBody));
                            }
                        );
                        listReq.end();
                    });
                }
            );
            createReq.write(JSON.stringify({ title: "NodeJS Test", message: "Wow", segment_id: "all" }));
            createReq.end();
        });
    }
);
req.write(data);
req.end();
