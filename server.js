const AWS = require('aws-sdk');
require('aws-sdk/lib/maintenance_mode_message').suppress = true;
const WebSocket = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

AWS.config.update({region: 'ap-southeast-2'});

const sqs = new AWS.SQS();
const queueUrl = 'https://sqs.ap-southeast-2.amazonaws.com/533267280357/AttendanceQueue';

wss.on('connection', function connection(ws) {
    console.log('Teacher 연결됨');
    ws.on('message', function incoming(message) {
        console.log('ws received: %s', message);
    });

    const receiveMessageParams = {
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20
    }; // From SQS documentation

    const pollSQS = () => {
        sqs.receiveMessage(receiveMessageParams, (err, data) => {
            if (err) {
                console.error("Error while polling msg from SQS(line 32):", err);
            } else if (data.Messages && data.Messages.length > 0) {
                data.Messages.forEach(message => { // data.Message가 array이므로 iterate하여 처리함
                    const body = JSON.parse(message.Body);
                    console.log(body)

                    if (body.Message.status) {
                        ws.send(`학생: ${body.Message.SID} - 상태: ${body.Message.status}`); // Teacher client에 ws로 출석한 학생 정보 전송
                    }

                    // SQS 중복 처리 방지 로직
                    let deleteParams = {
                        QueueUrl: queueUrl,
                        ReceiptHandle: message.ReceiptHandle
                    };
                    sqs.deleteMessage(deleteParams, function(err, data) {
                        if (err) {
                            console.error("메시지 삭제 에러(line 43)", err);
                        }
                    });
                });
            }
            setTimeout(pollSQS, 1000);
        });
    };

    pollSQS();
});

server.listen(8080, function listening() {
    console.log('Server is live - 8080');
});