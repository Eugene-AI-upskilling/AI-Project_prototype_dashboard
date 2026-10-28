Centered modal over a dim scrim. Use a single primary Button in the footer.

```jsx
<Dialog
  open={open}
  onClose={() => setOpen(false)}
  title="출금 확인"
  footer={<>
    <Button variant="secondary" onClick={() => setOpen(false)}>취소</Button>
    <Button variant="primary" onClick={confirm}>출금하기</Button>
  </>}
>
  0.0214 BTC를 등록된 주소로 출금합니다. 수수료를 확인하세요.
</Dialog>
```
