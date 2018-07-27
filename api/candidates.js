'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk'); 

AWS.config.setPromisesDependency(require('bluebird'));

const dynamoDb = new AWS.DynamoDB.DocumentClient();

/**
 * Create new candidates
 */
module.exports.submit = (event, context, callback) => {
  const requestBody = JSON.parse(event.body);
  const fullname = requestBody.fullname;
  const email = requestBody.email;
  const experience = requestBody.experience;

  if (typeof fullname !== 'string' || typeof email !== 'string' || typeof experience !== 'number') {
    console.error('Validation Failed');
    callback(new Error("COULDN\'t submit candidate because of validation errors."));
    return;
  }

  const submitCandidateP = (candidate) => {
    console.log('Submitting candidate...');
    const candidateInfo = {
      TableName: process.env.CANDIDATE_TABLE,
      Item: candidate,
    };

    return dynamoDb.put(candidateInfo).promise().then(res => candidate);
  };

  const candidateInfo = (fullname, email, experience) => {
    const timestamp = new Date().getTime();

    return {
      id: uuid.v1(),
      fullname: fullname,
      email: email,
      experience: experience,
      submittedAt: timestamp,
      updatedAt: timestamp,
    };
  }

  submitCandidateP(candidateInfo(fullname, email, experience))
    .then((res) => {
      callback(null, {
        statusCode: 200,
        body: JSON.stringify({
          message: `Sucessfully submitted candidate with email ${email}`,
          candidateId: res.id
        }),
      });
    })
    .catch((err) => {
      console.log(err);
      callback(null, {
        statusCode: 500,
        body: JSON.stringify({
          message: `Unable to submit candidate with email ${email}`
        })
      });
    });
};

/**
 * List all candidates
 */
module.exports.list = (event, context, callback) => {
  console.log("Listing...");
  let params = {
    TableName: process.env.CANDIDATE_TABLE,
    ProjectionExpression: "id, fullname, emails"
  };

  console.log("Scanning Candidate table.");
  const onScan = (err, data) => {
    if (err) {
      console.log(`Scan failed to load data. Error JSON: ${ JSON.stringify(err, null, 2) }`);
      callback(err);
    } else {
      console.log("Scan succeeded.");

      return callback(null, {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "http://localhost:8017"
        },
        body: JSON.stringify({
          candidate: data.Items
        })
      });
    }
  };

  dynamoDb.scan(params, onScan);
}

/**
 * Get Details of candidate by id
 */
module.exports.getDetails = (event, context, callback) => {
  const params = {
    TableName: process.env.CANDIDATE_TABLE,
    Key: {
      id: event.pathParameters.id,
    },
  };

  dynamoDb.get(params).promise()
    .then(result => {
      const response = {
        statusCode: 200,
        body:JSON.stringify(result.Item),
      };

      callback(null, response);
    })
    .catch(err => {
      console.error(err);
      callback(new Error("Couldn't fetch candidate."));
      return;
    });
}
