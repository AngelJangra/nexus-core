module.exports = (req, res) => {
    res.setHeader('Set-Cookie', 'dashboard_auth=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax');
    res.setHeader('Location', '/api/dashboard');
    res.status(302).send();
};
