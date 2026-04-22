async function run() {
    const loginResp = await fetch("http://localhost:8000/api/v1/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test_owner@loyallia.com", password: "123456" })
    });
    const loginData = await loginResp.json();
    console.log("LOGIN:", loginResp.status);
    const token = loginData.access_token;
    
    const createResp = await fetch("http://localhost:8000/api/v1/notifications/campaigns/", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ title: "NodeJS Test", message: "Wow", segment_id: "all" })
    });
    console.log("CREATE:", createResp.status, await createResp.text());
    
    const listResp = await fetch("http://localhost:8000/api/v1/notifications/campaigns/", {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });
    console.log("LIST HTTP STATUS:", listResp.status);
    console.log("LIST JSON:", await listResp.text());
}
run();
