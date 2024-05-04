const AWS = require('aws-sdk');
require('aws-sdk/lib/maintenance_mode_message').suppress = true; // Demo를 위해 warning 로그를 suppress시킴.
AWS.config.update({region: 'ap-southeast-2'});

const sqs = new AWS.SQS();
const sns = new AWS.SNS();

const queueUrl = 'https://sqs.ap-southeast-2.amazonaws.com/533267280357/AttendanceQueue';
const topicArn = 'arn:aws:sns:ap-southeast-2:533267280357:PubSubAttendanceSystem'; // Subscriber의 interest(Topic)

const receiveAttendanceMessage = async () => {
    console.log("Checking attendance message")
    const params = {
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 2,
        VisibilityTimeout: 30,
        WaitTimeSeconds: 10
    }; // From SQS documentation

    try {
        const data = await sqs.receiveMessage(params).promise();
        if (data.Messages && data.Messages.length > 0) { // Publisher로부터 message 수신, 그리고 message가 존재한다면
            const message = data.Messages[0];
            const body = JSON.parse(message.Body);

            if (body.Message.action && body.Message.action === 'start') { // 출석 시스템 디자인(Teacher의 message에 start라고 명시함)
                console.log(`출석 체크 시작 메시지 도착(강의코드: ${body.CID})`);

                await confirmAttendance(body.CID, message.ReceiptHandle); // 출석 확인 message 보냄
            }
        }
    } catch (err) {
        console.error("Error while receiving msg from SQS(line 32):", err);
    } finally {
        setImmediate(receiveAttendanceMessage) //recursive 반복(Demo를 위해 간단히 구현)
    }
};

const confirmAttendance = async (CID, receiptHandle) => {
    const confirmationMessage = {
        SID: '임도협_24101518',
        CID,
        timestamp: new Date().toISOString(),
        status: 'Present'
    };

    const publishParams = {
        Message: JSON.stringify(confirmationMessage),
        TopicArn: topicArn
    }; // From documentation

    try {
        const data = await sns.publish(publishParams).promise();

        console.log("출석 체크 완료");

        // SQS 중복 처리 방지를 위해 message 삭제
        await deleteMessage(receiptHandle);

        process.exit(0)
    } catch (err) {
        console.error("Error publishing SNS message:", err);
        process.exit(1)
    }
};

const deleteMessage = async (receiptHandle) => {
    const deleteParams = {
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle
    };

    try {
        const data = await sqs.deleteMessage(deleteParams).promise();
        console.log("Message 삭제 성공", data);
    } catch (err) {
        console.error("Message 삭제 실패(line 71):", err);
    }
};

receiveAttendanceMessage();
