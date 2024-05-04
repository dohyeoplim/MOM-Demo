const AWS = require("aws-sdk")
require('aws-sdk/lib/maintenance_mode_message').suppress = true;
AWS.config.update({region: 'ap-southeast-2'});

const WebSocket = require('ws');

const sns = new AWS.SNS();
const topicArn = "arn:aws:sns:ap-southeast-2:533267280357:PubSubAttendanceSystem";

const startAttendance = async(CID) => {
    const message = {
        CID,
        timestamp: new Date().toISOString(),
        action: "start"
    };

    const params = {
        Message: JSON.stringify(message),
        TopicArn: topicArn
    };

    try {
        const data = await sns.publish(params).promise();
        console.log(`출석 체크 시작(Class ID: ${CID}, Message ID: ${data.MessageId}`);
    } catch (e) {
        console.error("에러: ", e);
    };
};

const ws = new WebSocket('ws://localhost:8080');

ws.on('open', function open() {
    console.log('서버 연결됨(8080)');
});

ws.on('message', function incoming(data) {
    console.log('%s', data);
});

startAttendance("187001-11001");