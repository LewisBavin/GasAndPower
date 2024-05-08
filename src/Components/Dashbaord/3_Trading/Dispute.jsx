import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Col,
  Row,
  Container,
  Form,
  Button,
  Accordion,
  FloatingLabel,
} from "react-bootstrap";
import { differenceInDays, format, startOfDay, toDate } from "date-fns";
import { useDispatch } from "react-redux";
import { accountActions, readAccount } from "../../../Slices/AccountSlice";

const Dispute = ({ account, users }) => {
  let splitInit = {
    Pending: { You: [], Counterparty: [] },
    Rejected: { You: [], Counterparty: [] },
  };
  const dispatch = useDispatch();
  const [matched, setMatched] = useState([]);
  const [splits, setSplits] = useState(splitInit);
  const [dates, setDates] = useState({
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: format(new Date(), "yyyy-MM-dd"),
  });
  const [err, setErr] = useState(null);

  useEffect(() => {
    setSplits(
      [...matched].reduce((accum, m) => {
        accum[m.counter_rejected ? "Rejected" : "Pending"][
          account.user.user_id == m.dispute_user_id ? "You" : "Counterparty"
        ].push(m);
        return accum;
      }, splitInit)
    );
  }, [matched]);

  let updateDates = (e) => {
    let temp = { ...dates, [e.target.name]: e.target.value };
    let msg = null;
    let start = toDate(temp.start_date),
      end = toDate(temp.end_date);

    if (start == "Invalid Date" || end == "Invalid Date") {
      msg = "plese select valid dated";
    }
    if (start > end) {
      msg = "start must be before end";
    }
    setDates(temp);
    setErr(msg);
  };

  let getMatched = async (e) => {
    e.preventDefault();
    let { disputes } = (
      await axios.get("http://localhost:6002/user/get/disputes", {
        headers: {
          token: account.user.token,
          ...dates,
        },
      })
    ).data;
    setMatched(disputes);
  };

  let addComment = (e, key, innerKey, k) => {
    let temp = { ...splits };
    temp[key][innerKey][k].reject_comment = e.target.value;
    setSplits(temp);
  };

  let userName = (userID) =>
    userID == account.user.user_id
      ? account.user.name
      : users.find((u) => u.id == userID).name;

  let submit = matched.some((t) => t.checked);
  let haultSubmit = matched.some((t) => t.checked && !t.comment);

  let submitChanges = async (e, key, innerKey, k, bool) => {
    let trade = { ...splits }[key][innerKey][k];
    try {
      let { response, err } = (
        await axios.post(
          `http://localhost:6002/user/requests/${
            bool ? "acceptDispute" : "rejectDispute"
          }`,
          { trade },
          {
            headers: { token: account.user.token },
          }
        )
      ).data;
      if (response) {
        dispatch(
          accountActions.setToast({
            trigger: true,
            strong: "Success!",
            small: "dispute " + bool ? "accepted" : "rejected",
            body: bool
              ? "trade has been removed from the system"
              : "trade will be honoured and remain in the sytem",
            variant: "success",
            delay: 5000,
          })
        );
      } else if (err) {
        dispatch(
          accountActions.setToast({
            trigger: true,
            strong: "Error!",
            body: "Error responding to dispute",
            variant: "danger",
          })
        );
      }
    } catch (e) {
      dispatch(
        accountActions.setToast({
          trigger: true,
          strong: "Error!",
          small: "connection error",
          body: "please contact admin",
          variant: "warning",
        })
      );
    }
  };

  let content = {
    Pending: {
      You: {
        msg: "Counterparty has yet to respond to your dispute.",
        label1: "your dispute:",
        label2: "their reply:",
      },
      Counterparty: {
        msg: "Please review this counterparty's dispute.",
        label1: "their dispute:",
        label2: "your reply:",

        edit: true,
      },
    },
    Rejected: {
      label1: "dispute:",
      label2: "rejection:",
      You: {
        msg: "Counterparty has rejected your dispute:",
        label1: "your dispute:",
        label2: "their rejection:",
      },
      Counterparty: {
        msg: "You have rejected this counterparty's dispute",
        label1: "their dispute:",
        label2: "your rejection:",
      },
    },
  };

  return (
    <div className="flx jc-c ai-c col">
      <Container>
        <Container className="text-center">
          <Row>
            <Form onSubmit={getMatched}>
              <Row>
                <Col className="text-primary d-flex justify-content-center align-items-center pt-3">
                  Filter Disputes
                </Col>
              </Row>
              <Row>
                <Col className="text-danger d-flex justify-content-center align-items-center">
                  {err}
                </Col>
              </Row>
              <Row className="d-flex justify-content-center py-3">
                <Col xs={3} className="d-flex align-items-center">
                  <Form.Text className="text-muted">Start Date</Form.Text>
                  <Form.Control
                    type="date"
                    name="start_date"
                    value={
                      !dates.start_date ? dates.end_date : dates.start_date
                    }
                    onChange={updateDates}
                  />
                </Col>
                <Col xs={3} className="d-flex align-items-center">
                  <Form.Text className="text-muted">End Date</Form.Text>
                  <Form.Control
                    type="date"
                    name="end_date"
                    value={!dates.end_date ? dates.start_date : dates.end_date}
                    onChange={updateDates}
                  />
                </Col>
                <Col xs={1} className="d-flex align-items-center">
                  <Button
                    type="submit"
                    disabled={!!err}
                    variant={!!err ? "danger" : "success"}
                  >
                    Go
                  </Button>
                </Col>
              </Row>
            </Form>
          </Row>
        </Container>
        <Container>
          <Row className="justify-content-md-center p-2">
            {submit && (
              <Button
                disabled={haultSubmit}
                variant={haultSubmit ? "danger" : "success"}
                onClick={submitChanges}
              >
                Send Disputes
              </Button>
            )}
          </Row>
        </Container>
      </Container>
      <Container>
        <Accordion>
          {Object.entries(splits).map(([key, innerObj], i) => (
            <Accordion key={i}>
              <Accordion.Item>
                <Accordion.Header>
                  {key + " Disputes - Trades Still Honoured"}
                </Accordion.Header>
                <Accordion.Body>
                  {Object.entries(innerObj).map(([innerKey, arr], j) => (
                    <Accordion key={j}>
                      <Accordion.Item>
                        <Accordion.Header>
                          {"Raised By " + innerKey}
                        </Accordion.Header>
                        <Accordion.Body>
                          {arr.map((trade, k) => (
                            <Form key={k} className=" col ai-c jc-c">
                              <div className="flx ai-c jc-c">
                                <FloatingLabel label="Id">
                                  <Form.Control
                                    disabled
                                    defaultValue={trade.trade_id}
                                  />
                                </FloatingLabel>
                                <FloatingLabel label="User Requested">
                                  <Form.Control
                                    disabled
                                    defaultValue={userName(trade.user_id)}
                                  />
                                </FloatingLabel>
                                <FloatingLabel label="Dir">
                                  <Form.Control
                                    disabled
                                    defaultValue={trade.direction}
                                  />
                                </FloatingLabel>
                                <FloatingLabel label="Counter Accepted">
                                  <Form.Control
                                    disabled
                                    defaultValue={userName(trade.counter_id)}
                                  />
                                </FloatingLabel>
                                <FloatingLabel label="Start">
                                  <Form.Control
                                    disabled
                                    defaultValue={format(
                                      trade.start_date,
                                      "yyyy-MM-dd"
                                    )}
                                  />
                                </FloatingLabel>
                                <FloatingLabel label="End">
                                  <Form.Control
                                    disabled
                                    defaultValue={format(
                                      trade.end_date,
                                      "yyyy-MM-dd"
                                    )}
                                  />
                                </FloatingLabel>
                                <FloatingLabel label="Vol / Day">
                                  <Form.Control
                                    disabled
                                    defaultValue={trade.volume}
                                  />
                                </FloatingLabel>
                                <FloatingLabel label="Price">
                                  <Form.Control
                                    disabled
                                    defaultValue={trade.price}
                                  />
                                </FloatingLabel>
                                <FloatingLabel label="Tot Vol">
                                  <Form.Control
                                    disabled
                                    defaultValue={trade.total_volume}
                                  />
                                </FloatingLabel>
                                <FloatingLabel
                                  label="Dispute Raised By"
                                  style={{ minWidth: "160px" }}
                                >
                                  <Form.Control
                                    disabled
                                    defaultValue={userName(
                                      trade.dispute_user_id
                                    )}
                                  />
                                </FloatingLabel>
                              </div>

                              <div>
                                <Form.Text>
                                  {content[key][innerKey].msg}
                                </Form.Text>
                                <div className="flx jc-c">
                                  <FloatingLabel
                                    label={content[key][innerKey].label1}
                                  >
                                    <Form.Control
                                      disabled
                                      as="textarea"
                                      defaultValue={trade.comment}
                                    />
                                  </FloatingLabel>
                                  <FloatingLabel
                                    label={content[key][innerKey].label2}
                                  >
                                    <Form.Control
                                      disabled={!content[key][innerKey].edit}
                                      as="textarea"
                                      value={trade.reject_comment}
                                      onChange={(e) =>
                                        addComment(e, key, innerKey, k)
                                      }
                                    />
                                  </FloatingLabel>
                                  {content[key][innerKey].edit && (
                                    <>
                                      <Button
                                        variant="success"
                                        onClick={(e) =>
                                          submitChanges(
                                            e,
                                            key,
                                            innerKey,
                                            k,
                                            true
                                          )
                                        }
                                      >
                                        Accept
                                      </Button>
                                      <Button
                                        variant="danger"
                                        onClick={(e) =>
                                          submitChanges(
                                            e,
                                            key,
                                            innerKey,
                                            k,
                                            false
                                          )
                                        }
                                      >
                                        Reject
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </Form>
                          ))}
                        </Accordion.Body>
                      </Accordion.Item>
                    </Accordion>
                  ))}
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
          ))}
        </Accordion>

        {/* <Accordion>
          {Object.entries(splits).map(([key, innerObj], i) => (
            <Accordion.Item >
              <Accordion.Header>{"Disputes Raised By " + key}</Accordion.Header>
              <Accordion.Body>
                {Object.entries(innerObj).map(([innerKey, arr],j)=>{
                    <Accordion.Item key={j}>
                        <Accordion.Header>{innerKey}<Accordion.Header/>
                            <Accordion.Body>

                            <Accordion.Body/>
            <Accordion.Item/>
                })}
                {arr.map((t, i) => (
                  <Form key={i} className=" col ai-c jc-c">
                    <div className="flx ai-c jc-c">
                      <FloatingLabel label="Id">
                        <Form.Control disabled defaultValue={t.trade_id} />
                      </FloatingLabel>
                      <FloatingLabel label="User">
                        <Form.Control
                          disabled
                          defaultValue={userName(t.user_id)}
                        />
                      </FloatingLabel>
                      <FloatingLabel label="Dir">
                        <Form.Control disabled defaultValue={t.direction} />
                      </FloatingLabel>
                      <FloatingLabel label="Counter">
                        <Form.Control
                          disabled
                          defaultValue={userName(t.counter_id)}
                        />
                      </FloatingLabel>
                      <FloatingLabel label="Start">
                        <Form.Control
                          disabled
                          defaultValue={format(t.start_date, "yyyy-MM-dd")}
                        />
                      </FloatingLabel>
                      <FloatingLabel label="End">
                        <Form.Control
                          disabled
                          defaultValue={format(t.end_date, "yyyy-MM-dd")}
                        />
                      </FloatingLabel>
                      <FloatingLabel label="Vol / Day">
                        <Form.Control disabled defaultValue={t.volume} />
                      </FloatingLabel>
                      <FloatingLabel label="Price">
                        <Form.Control disabled defaultValue={t.price} />
                      </FloatingLabel>
                      <FloatingLabel label="Tot Vol">
                        <Form.Control disabled defaultValue={t.total_volume} />
                      </FloatingLabel>
                      <FloatingLabel
                        label="Dispute Raised By"
                        style={{ minWidth: "160px" }}
                      >
                        <Form.Control
                          disabled
                          defaultValue={userName(t.dispute_user_id)}
                        />
                      </FloatingLabel>
                    </div>

                    <div>
                      <Form.Text>
                        {key == "You"
                          ? "Counterparty has yet to accept your dispute"
                          : "Please review their"}
                      </Form.Text>
                      <Form.Text>
                        {key == "You"
                          ? "Your Dispute Comments:"
                          : "Their Dispute Comments"}
                      </Form.Text>
                      <Form.Control
                        value={t.comment ? t.comment : ""}
                        onChange={(e) => addComment(e, key, i)}
                      />
                    </div>
                  </Form>
                ))}
              </Accordion.Body>
            </Accordion.Item>
          ))}
        </Accordion> */}
      </Container>
    </div>
  );
};

export default Dispute;
