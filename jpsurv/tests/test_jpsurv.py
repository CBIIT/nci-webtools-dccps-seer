import unittest
from jpsurv import app


class BasicTests(unittest.TestCase):
    def setUp(self):
        # creates a test client
        self.app = app.test_client()

    def tearDown(self):
        pass

    def test_ping(self):
        # sends HTTP GET request to the application
        # on the specified path
        result = self.app.get("/ping")

        # assert the status code of the response
        self.assertEqual(result.status_code, 200)

    def test_home(self):
        result = self.app.get("/index.html")
        assert result.status_code == 200

    def test_upload(self):
        txt = open('./data/Rocky.txt', 'rb')
        dic = open('./data/Rocky.dic', 'rb')

        data = {'file_control': [(txt, 'Rocky.txt'), (dic, 'Rocky.dic')]}

        res = self.app.post(
            '/jpsurvRest/stage1_upload?tokenId=123456&input_type=dic', data=data, follow_redirects=False)

        txt.close()
        dic.close()

        assert res.status_code == 302
        assert res.location == 'http://localhost/?request=false&file_control_filename=Rocky.dic&file_data_filename=Rocky.txt&output_filename=form-123456.json&status=uploaded&tokenId=123456'


if __name__ == "__main__":
    unittest.main()
